// app/api/businesses/[id]/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { Claim } from '@/lib/models/Claim';
import mongoose from 'mongoose';
import { sendVerificationCode } from '@/lib/email';
import { rateLimit, claimSubmitLimiter, claimVerifyLimiter, getIP } from '@/lib/ratelimit';
import { validate, ClaimSchema } from '@/lib/validations';

const MAX_ACTIVE_CLAIMS = 3;
const COOLDOWN_MS       = 48 * 60 * 60 * 1000; // 48 h
const CODE_EXPIRY_MS    = 15 * 60 * 1000;       // 15 min
const MAX_ATTEMPTS      = 5;

function generateCode(): string {
  return randomInt(100000, 1000000).toString();
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function codesMatch(input: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(input.trim()), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// POST /api/businesses/[id]/claim — submit a claim request
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await rateLimit(claimSubmitLimiter, req, getIP(req));
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to claim a business' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const body = await req.json();
    const validation = validate(ClaimSchema, body);
    if (!validation.success) return validation.error;
    const { proofType, proofValue } = validation.data;

    const business = await Business.findById(id).select('name isClaimed email phone').lean();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const biz = business as any;
    if (biz.isClaimed) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 409 });
    }

    // Cap: no more than 3 active claims per user across all businesses
    const activeCount = await Claim.countDocuments({
      user:   userId,
      status: { $in: ['pending', 'verified'] },
    });
    if (activeCount >= MAX_ACTIVE_CLAIMS) {
      return NextResponse.json({
        error: 'You have too many pending claims. Wait for existing ones to be reviewed.',
      }, { status: 429 });
    }

    // 48-hour cooldown after a rejection for this specific business
    const recentRejection = await Claim.findOne({
      business:       id,
      user:           userId,
      status:         'rejected',
      lastRejectedAt: { $gte: new Date(Date.now() - COOLDOWN_MS) },
    }).lean() as any;

    if (recentRejection) {
      const cooldownEnd = new Date(recentRejection.lastRejectedAt.getTime() + COOLDOWN_MS);
      return NextResponse.json({
        error: `Your previous claim was rejected. You can re-submit after ${cooldownEnd.toISOString().split('T')[0]}.`,
      }, { status: 429 });
    }

    // Block duplicate active claim by this user for this business
    const existing = await Claim.findOne({
      business: id,
      user:     userId,
      status:   { $in: ['pending', 'verified'] },
    }).lean() as any;

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending claim for this business', claimId: existing._id },
        { status: 409 }
      );
    }

    // Block if another user's claim is already in the verified/approved pipeline
    const otherClaim = await Claim.findOne({
      business: id,
      status:   { $in: ['verified', 'approved'] },
    }).lean();

    if (otherClaim) {
      return NextResponse.json(
        { error: 'Another claim is being processed for this business' },
        { status: 409 }
      );
    }

    // Soft cross-check: flag mismatch for admin awareness
    const normalize = (s: string) => s.replace(/[\s\-().]/g, '').toLowerCase();
    let mismatchNote = '';
    if (proofType === 'email' && biz.email) {
      if (normalize(biz.email) !== normalize(proofValue)) {
        mismatchNote = `[System] Claimed email (${proofValue}) does not match listing email (${biz.email}).`;
      }
    } else if (proofType === 'phone' && biz.phone) {
      if (normalize(biz.phone) !== normalize(proofValue)) {
        mismatchNote = `[System] Claimed phone (${proofValue}) does not match listing phone (${biz.phone}).`;
      }
    }

    const code         = generateCode();
    const codeHash     = hashCode(code);
    const verifyExpiry = new Date(Date.now() + CODE_EXPIRY_MS);

    const claim = await Claim.create({
      business:  id,
      user:      userId,
      proofType,
      proofValue,
      codeHash,
      verifyExpiry,
      ...(mismatchNote ? { reviewNote: mismatchNote } : {}),
    });

    try {
      await sendVerificationCode(proofValue, code, proofType);
    } catch (emailErr) {
      console.error('[claim] Failed to send verification code:', emailErr);
    }

    return NextResponse.json({
      success: true,
      claimId: claim._id,
      message: `A 6-digit code has been sent to ${proofValue}. Enter it within 15 minutes.`,
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/businesses/[id]/claim]', err);
    return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
  }
}

// PATCH /api/businesses/[id]/claim — verify the OTP
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await rateLimit(claimVerifyLimiter, req, getIP(req));
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id }            = await params;
    const { claimId, code } = await req.json();

    if (!claimId || !code || typeof code !== 'string') {
      return NextResponse.json({ error: 'claimId and code are required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    // Select +codeHash because the field has select:false on the model
    const claim = await Claim.findOne({
      _id:      claimId,
      business: id,
      user:     session.user.id,
      status:   'pending',
    }).select('+codeHash');

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found or already processed' }, { status: 404 });
    }

    if (new Date() > claim.verifyExpiry) {
      claim.status = 'locked';
      await claim.save();
      return NextResponse.json({
        error: 'Verification code has expired. Please submit a new claim.',
      }, { status: 400 });
    }

    // Increment attempts before comparing — prevents parallel brute-force
    claim.attempts = (claim.attempts ?? 0) + 1;

    if (claim.attempts > MAX_ATTEMPTS) {
      claim.status = 'locked';
      await claim.save();
      return NextResponse.json({
        error: 'Too many incorrect attempts. Please submit a new claim.',
      }, { status: 429 });
    }

    if (!codesMatch(code, claim.codeHash)) {
      await claim.save();
      const remaining = MAX_ATTEMPTS - claim.attempts;
      return NextResponse.json({
        error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      }, { status: 400 });
    }

    // Code correct — clear hash to prevent replay
    claim.status     = 'verified';
    claim.verifiedAt = new Date();
    claim.codeHash   = '';
    await claim.save();

    return NextResponse.json({
      success: true,
      message: "Code verified! Your claim is now awaiting admin review. We'll email you when it's approved.",
    });

  } catch (err) {
    console.error('[PATCH /api/businesses/[id]/claim]', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

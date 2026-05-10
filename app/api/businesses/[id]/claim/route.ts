// app/api/businesses/[id]/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { Claim } from '@/lib/models/Claim';
import mongoose from 'mongoose';
import { sendVerificationCode } from '@/lib/email';
import { rateLimit, claimSubmitLimiter, claimVerifyLimiter, getIP } from '@/lib/ratelimit';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/businesses/[id]/claim — submit a claim request
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ── Rate limit: 5 claim submissions per IP per hour ──
    const limited = await rateLimit(claimSubmitLimiter, req, getIP(req));
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to claim a business' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid session — please sign out and back in' }, { status: 400 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const { proofType, proofValue } = await req.json();

    if (!proofType || !proofValue?.trim()) {
      return NextResponse.json({ error: 'Please provide your contact info for verification' }, { status: 400 });
    }

    const business = await Business.findById(id).lean();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    if ((business as any).isClaimed) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 409 });
    }

    const existing = await Claim.findOne({
      business: id,
      user:     userId,
      status:   { $in: ['pending', 'verified'] },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending claim for this business', claimId: existing._id },
        { status: 409 }
      );
    }

    const otherClaim = await Claim.findOne({
      business: id,
      status:   { $in: ['verified', 'approved'] },
    });

    if (otherClaim) {
      return NextResponse.json(
        { error: 'Another claim is being processed for this business' },
        { status: 409 }
      );
    }

    const verifyCode   = generateCode();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const claim = await Claim.create({
      business: id,
      user:     userId,
      proofType,
      proofValue: proofValue.trim(),
      verifyCode,
      verifyExpiry,
    });

    try {
      await sendVerificationCode(proofValue.trim(), verifyCode, proofType);
    } catch (emailErr) {
      console.error('[email] Failed to send verification code:', emailErr);
    }

    return NextResponse.json({
      success: true,
      claimId: claim._id,
      message: `A verification code has been sent to ${proofValue}. Enter it to confirm your claim.`,
      _devCode: process.env.NODE_ENV === 'development' ? verifyCode : undefined,
    }, { status: 201 });

  } catch (err: any) {
    console.error('[POST /api/businesses/[id]/claim]', err);
    return NextResponse.json({ error: err.message ?? 'Failed to submit claim' }, { status: 500 });
  }
}

// PATCH /api/businesses/[id]/claim — verify the code
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ── Rate limit: 10 code attempts per IP per hour (brute-force protection) ──
    const limited = await rateLimit(claimVerifyLimiter, req, getIP(req));
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id }            = await params;
    const { claimId, code } = await req.json();

    if (!claimId || !code) {
      return NextResponse.json({ error: 'claimId and code are required' }, { status: 400 });
    }

    const claim = await Claim.findOne({
      _id:      claimId,
      business: id,
      user:     session.user.id,
      status:   'pending',
    });

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found or already processed' }, { status: 404 });
    }

    if (new Date() > claim.verifyExpiry) {
      return NextResponse.json({
        error: 'Verification code has expired. Please submit a new claim.',
      }, { status: 400 });
    }

    if (claim.verifyCode !== code.trim()) {
      return NextResponse.json({ error: 'Incorrect verification code' }, { status: 400 });
    }

    claim.status     = 'verified';
    claim.verifiedAt = new Date();
    await claim.save();

    return NextResponse.json({
      success: true,
      message: "Code verified! Your claim is now awaiting admin review. We'll email you when it's approved.",
    });

  } catch (err: any) {
    console.error('[PATCH /api/businesses/[id]/claim]', err);
    return NextResponse.json({ error: err.message ?? 'Verification failed' }, { status: 500 });
  }
}
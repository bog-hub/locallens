// app/api/admin/claims/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Claim } from '@/lib/models/Claim';
import { Business } from '@/lib/models/Business';
import { User } from '@/lib/models/User';
import mongoose from 'mongoose';
import { sendClaimApprovedEmail, sendClaimRejectedEmail } from '@/lib/email';
import { rateLimit, getIP } from '@/lib/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Admin actions — 30 per hour per IP
const adminLimiter = new Ratelimit({
  redis: new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:admin',
});

// PATCH /api/admin/claims/[id] — approve or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ── 1. Authentication ──
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    // ── 2. Authorisation ──
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    // ── 3. Rate limit — keyed by admin user ID ──
    const limited = await rateLimit(adminLimiter, req, session.user.id);
    if (limited) return limited;

    await connectDB();
    const { id } = await params;

    // ── 4. Validate ObjectId ──
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    const { action, reviewNote } = await req.json();

    // ── 5. Validate action ──
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const claim = await Claim.findById(id)
      .populate('user',     'name email')
      .populate('business', 'name slug');

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'verified') {
      return NextResponse.json(
        { error: `Cannot ${action} a claim with status "${claim.status}"` },
        { status: 400 }
      );
    }

    const claimUser     = claim.user     as any;
    const claimBusiness = claim.business as any;

    if (action === 'approve') {
      // ── Atomic update: only set owner if not already claimed ──
      const updatedBusiness = await Business.findOneAndUpdate(
        { _id: claimBusiness._id, isClaimed: false },
        { owner: claimUser._id, isClaimed: true, isVerified: true },
        { new: true }
      );

      if (!updatedBusiness) {
        return NextResponse.json(
          { error: 'Business has already been claimed by another process' },
          { status: 409 }
        );
      }

      // ── Reject any other pending claims for this business ──
      await Claim.updateMany(
        {
          business: claimBusiness._id,
          _id:      { $ne: claim._id },
          status:   { $in: ['pending', 'verified'] },
        },
        {
          status:     'rejected',
          reviewNote: 'Another claim was approved',
          reviewedAt: new Date(),
        }
      );

      claim.status     = 'approved';
      claim.reviewNote = reviewNote;
      claim.reviewedBy = session.user.id as any;
      claim.reviewedAt = new Date();
      await claim.save();

      // ── Notify the user by email ──
      try {
        await sendClaimApprovedEmail({
          email:        claimUser.email,
          name:         claimUser.name,
          businessName: claimBusiness.name,
          businessSlug: claimBusiness.slug,
        });
      } catch (emailErr) {
        console.error('[email] Failed to send claim approved email:', emailErr);
      }

      console.log(`[Admin] ${session.user.email} approved claim for "${claimBusiness.name}" → ${claimUser.email}`);

    } else {
      claim.status          = 'rejected';
      claim.reviewNote      = reviewNote;
      claim.reviewedBy      = session.user.id as any;
      claim.reviewedAt      = new Date();
      claim.lastRejectedAt  = new Date();
      await claim.save();

      // ── Notify the user by email ──
      try {
        await sendClaimRejectedEmail({
          email:        claimUser.email,
          name:         claimUser.name,
          businessName: claimBusiness.name,
          reviewNote:   reviewNote ?? 'No reason provided',
        });
      } catch (emailErr) {
        console.error('[email] Failed to send claim rejected email:', emailErr);
      }

      console.log(`[Admin] ${session.user.email} rejected claim for "${claimBusiness.name}": ${reviewNote}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/admin/claims/[id]]', err);
    return NextResponse.json({ error: 'Failed to process claim' }, { status: 500 });
  }
}
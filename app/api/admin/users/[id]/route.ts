// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import mongoose from 'mongoose';
import { rateLimit, getIP } from '@/lib/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Admin actions — 30 per hour per IP (generous but capped)
const adminLimiter = new Ratelimit({
  redis: new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'rl:admin',
});

const VALID_ROLES = ['user', 'owner', 'admin'] as const;

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
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { role } = await req.json();

    // ── 5. Validate role value ──
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 6. Prevent admin from demoting themselves ──
    if (id === session.user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own admin role' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: 'name email role' }
    ).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[Admin] ${session.user.email} changed role of ${(user as any).email} → ${role}`);

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[PATCH /api/admin/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
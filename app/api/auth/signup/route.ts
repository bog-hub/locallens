// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import { sendWelcomeEmail } from '@/lib/email';
import { rateLimit, signupLimiter, getIP } from '@/lib/ratelimit';
import { SignupSchema, validate } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 5 signups per IP per 10 minutes ──
    const limited = await rateLimit(signupLimiter, req, getIP(req));
    if (limited) return limited;

    const body = await req.json();

    // ── Zod validation ──
    const result = validate(SignupSchema, body);
    if (!result.success) return result.error;
    const { name, email, password } = result.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Password is hashed automatically by the User pre-save hook
    await User.create({ name, email, password });

    try {
      if (process.env.NODE_ENV === 'production') {
        await sendWelcomeEmail({ email, name });
      }
    } catch {
      // Don't fail signup if email fails
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
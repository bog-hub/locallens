// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Limiters ────────────────────────────────────────────────────────────────

// Signup — 5 attempts per IP per 10 minutes
export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'rl:signup',
});

// Signin — 10 attempts per IP per 10 minutes
export const signinLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 m'),
  prefix: 'rl:signin',
});

// Claim submit — 5 per IP per hour (prevents spam claim requests)
export const claimSubmitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:claim:submit',
});

// Claim code verify — 10 per IP per hour (most critical — brute force protection)
export const claimVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:claim:verify',
});

// Review submit — 10 per user per hour
export const reviewLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:review',
});

// Business create — 10 per user per hour
export const businessCreateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:business:create',
});

// ── Helper ──────────────────────────────────────────────────────────────────

/**
 * Run a rate limit check and return a 429 response if exceeded.
 *
 * @param limiter  - one of the exported limiters above
 * @param req      - the incoming NextRequest
 * @param key      - identifier (use IP for public routes, user ID for authed routes)
 *
 * Returns null if the request is allowed, or a NextResponse(429) if blocked.
 *
 * Usage:
 *   const limited = await rateLimit(signupLimiter, req, getIP(req));
 *   if (limited) return limited;
 */
export async function rateLimit(
  limiter: Ratelimit,
  req: NextRequest,
  key: string,
): Promise<NextResponse | null> {
  const { success, limit, remaining, reset } = await limiter.limit(key);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(reset),
          'Retry-After':           String(retryAfter),
        },
      },
    );
  }

  return null;
}

/**
 * Extract the real client IP from the request.
 * Vercel sets x-forwarded-for; falls back to a fixed string in local dev.
 */
export function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'local'
  );
}
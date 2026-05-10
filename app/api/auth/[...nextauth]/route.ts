// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

// Destructure explicitly — re-exporting handlers directly breaks Next.js route detection
export const GET  = handlers.GET;
export const POST = handlers.POST;
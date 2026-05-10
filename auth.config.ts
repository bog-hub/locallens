// auth.config.ts — edge-safe, used only by proxy.ts
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [], // providers with Node.js deps live in lib/auth.ts only

  pages: {
    signIn: '/login',
    error:  '/login',
  },
};
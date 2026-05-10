// lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID     ?? process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select('+password');
        if (!user || !user.password) return null;
        const valid = await user.comparePassword(credentials.password as string);
        if (!valid) return null;
        return {
          id:    user._id.toString(),   // real MongoDB ObjectId string
          name:  user.name,
          email: user.email,
          image: user.image,
          role:  user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        // Upsert the Google user so they always have a MongoDB doc
        await User.findOneAndUpdate(
          { email: user.email },
          { $setOnInsert: { name: user.name, email: user.email, image: user.image, role: 'user' } },
          { upsert: true, new: true }
        );
      }
      return true;
    },

    async jwt({ token, account }) {
      // Always resolve the real MongoDB _id from the email.
      // We do this on every JWT creation/refresh because Google's `user.id`
      // is a provider UUID, not our MongoDB ObjectId.
      if (token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email }).lean();
        if (dbUser) {
          token.id   = (dbUser as any)._id.toString(); // always the real MongoDB _id
          token.role = (dbUser as any).role ?? 'user';
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string;  // now always a valid ObjectId string
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: { strategy: 'jwt' },
});
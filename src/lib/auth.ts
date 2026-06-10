import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Provider } from 'next-auth/providers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type SessionPatch = {
  image?: string;
  isOnboarded?: boolean;
};

type UserWithOnboarding = {
  isOnboarded?: boolean | null;
};

const providers: Provider[] = [
  Credentials({
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user || !user.passwordHash) return null;
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatarUrl,
        isOnboarded: user.isOnboarded,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.isOnboarded = (user as UserWithOnboarding).isOnboarded;
      }
      const patch = session as SessionPatch | undefined;
      if (trigger === 'update' && typeof patch?.isOnboarded === 'boolean') {
        token.isOnboarded = patch.isOnboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as typeof session.user & { isOnboarded?: unknown }).isOnboarded = token.isOnboarded;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/onboarding',
  },
});

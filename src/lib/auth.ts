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
        image: user.avatarUrl && user.avatarUrl.startsWith('data:') 
          ? `/api/users/avatar?userId=${user.id}&t=${Date.now()}` 
          : user.avatarUrl,
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
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === 'google' && user?.email) {
        let [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
        if (!dbUser) {
          [dbUser] = await db.insert(users).values({
            email: user.email,
            name: user.name || 'Explorer',
            avatarUrl: user.image,
            authProvider: 'google',
            isVerified: true,
          }).returning();
        }
        token.id = dbUser.id;
        token.isOnboarded = dbUser.isOnboarded;
        token.needsCompletion = dbUser.age === null;
        if (dbUser.avatarUrl) token.picture = dbUser.avatarUrl;
      } else if (user) {
        token.id = user.id;
        token.isOnboarded = (user as UserWithOnboarding).isOnboarded;
        token.needsCompletion = false;
        if (user.image) token.picture = user.image;
      }

      const patch = session as SessionPatch & { needsCompletion?: boolean } | undefined;
      if (trigger === 'update') {
        if (typeof patch?.isOnboarded === 'boolean') {
          token.isOnboarded = patch.isOnboarded;
        }
        if (typeof patch?.image === 'string') {
          token.picture = patch.image;
        }
        if (typeof patch?.needsCompletion === 'boolean') {
          token.needsCompletion = patch.needsCompletion;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).isOnboarded = token.isOnboarded;
        (session.user as any).needsCompletion = token.needsCompletion;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/onboarding',
  },
});

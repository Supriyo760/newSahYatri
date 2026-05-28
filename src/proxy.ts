import { auth } from '@/lib/auth';

type SessionUserWithOnboarding = {
  isOnboarded?: boolean | null;
};

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  const publicPaths = ['/auth/login', '/auth/register', '/'];
  if (publicPaths.some((publicPath) => path.startsWith(publicPath))) return;

  if (!isLoggedIn) {
    return Response.redirect(new URL('/auth/login', req.url));
  }

  const user = req.auth?.user as SessionUserWithOnboarding | undefined;
  if (!user?.isOnboarded && !path.startsWith('/onboarding')) {
    return Response.redirect(new URL('/onboarding', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

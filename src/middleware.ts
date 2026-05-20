import { auth } from '@/lib/auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  const publicPaths = ['/auth/login', '/auth/register', '/'];
  if (publicPaths.some(p => path.startsWith(p))) return;

  if (!isLoggedIn) {
    return Response.redirect(new URL('/auth/login', req.url));
  }

  // Force onboarding completion
  const isOnboarded = (req.auth?.user as any)?.isOnboarded;
  if (!isOnboarded && !path.startsWith('/onboarding')) {
    return Response.redirect(new URL('/onboarding', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

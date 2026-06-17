import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const needsCompletion = (req.auth?.user as any)?.needsCompletion;

  const isAuthRoute = nextUrl.pathname.startsWith('/auth/');
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/');
  const isPublicRoute = nextUrl.pathname === '/';

  if (isApiAuthRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (nextUrl.pathname.startsWith('/auth/complete-profile')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
      }
      if (!needsCompletion) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
      }
      return NextResponse.next();
    }
    
    if (isLoggedIn && !needsCompletion) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/register', nextUrl));
  }

  if (isLoggedIn && needsCompletion && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/complete-profile', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};

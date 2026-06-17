import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

type SessionUserWithOnboarding = {
  isOnboarded?: boolean | null;
  needsCompletion?: boolean | null;
};

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api/')) return NextResponse.next();

  const isPublicRoute = path === '/';
  const isAuthRoute = path.startsWith('/auth/');
  
  const user = req.auth?.user as SessionUserWithOnboarding | undefined;
  const needsCompletion = user?.needsCompletion;
  const isOnboarded = user?.isOnboarded;

  if (isAuthRoute) {
    if (path.startsWith('/auth/complete-profile')) {
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
      if (!needsCompletion) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }
    
    if (isLoggedIn && !needsCompletion) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/register', req.url));
  }

  if (isLoggedIn && needsCompletion && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/complete-profile', req.url));
  }

  if (isLoggedIn && !needsCompletion && !isOnboarded && !path.startsWith('/onboarding') && !isPublicRoute) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

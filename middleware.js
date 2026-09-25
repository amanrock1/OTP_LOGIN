import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const token = sessionCookie ? sessionCookie.value : null;

  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = Boolean(session && session.email);

  // 1. Protect /dashboard routes: unauthenticated users redirected to login
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirected', 'true');
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. If already logged in and visiting the login page '/', redirect directly to '/dashboard'
  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};

import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Expire the session cookie immediately
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Immediately expire
  });

  return response;
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  verifySessionToken,
  createSessionToken,
} from '@/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify current token
    const payload = await verifySessionToken(sessionCookie.value);
    if (!payload || !payload.email) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Generate a fresh 20-minute token extending the active session (sliding expiration)
    const freshToken = await createSessionToken({ email: payload.email });

    const response = NextResponse.json({
      success: true,
      refreshedAt: Date.now(),
    });

    response.cookies.set({
      ...SESSION_COOKIE_OPTIONS,
      value: freshToken,
    });

    return response;
  } catch (err) {
    console.error('Session refresh error:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

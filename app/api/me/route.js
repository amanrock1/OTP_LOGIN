import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(sessionCookie.value);
    if (!payload || !payload.email) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: payload.email,
      },
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}

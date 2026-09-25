import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { normalizeEmail, isValidEmail, hashOtp } from '@/lib/utils';
import {
  createSessionToken,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/session';

// Constants
const VERIFY_RATE_LIMIT_MAX = 5; // Max 5 failed attempts
const VERIFY_LOCKOUT_WINDOW = 900; // 15 minutes window in seconds

export async function POST(request) {
  try {
    const body = await request.json();
    const rawEmail = body.email;
    const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

    // 1. Normalize and Validate Email
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address provided.' },
        { status: 400 }
      );
    }

    // 2. Validate OTP format (must be 6 digits)
    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit code.' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();

    // 3. Check Brute-Force Rate Limit for Verification Attempts
    const verifyRateLimitKey = `ratelimit:verify:${email}`;
    const failedAttempts = parseInt((await redis.get(verifyRateLimitKey)) || '0', 10);

    if (failedAttempts >= VERIFY_RATE_LIMIT_MAX) {
      const ttl = await redis.ttl(verifyRateLimitKey);
      const minutesLeft = Math.ceil((ttl > 0 ? ttl : VERIFY_LOCKOUT_WINDOW) / 60);
      return NextResponse.json(
        {
          error: `Too many failed attempts. Verification is locked for ${minutesLeft} minute(s). Please request a new OTP.`,
        },
        { status: 429 }
      );
    }

    // 4. Retrieve Hashed OTP from Redis
    const otpKey = `otp:${email}`;
    const storedHash = await redis.get(otpKey);

    // 5. Hash Provided OTP and Compare
    const providedHash = hashOtp(otp);

    if (!storedHash || storedHash !== providedHash) {
      // Increment failed attempts counter in Redis
      const newAttempts = await redis.incr(verifyRateLimitKey);
      if (newAttempts === 1) {
        await redis.expire(verifyRateLimitKey, VERIFY_LOCKOUT_WINDOW);
      }

      const remainingAttempts = VERIFY_RATE_LIMIT_MAX - newAttempts;
      const warningMessage =
        remainingAttempts > 0
          ? `Invalid or expired code. ${remainingAttempts} attempt(s) remaining.`
          : 'Invalid code. Too many failed attempts, account locked for 15 minutes.';

      return NextResponse.json(
        { error: warningMessage },
        { status: 400 }
      );
    }

    // 6. OTP is Valid! Immediately Delete OTP from Redis to prevent replay attacks
    await redis.del(otpKey);
    // Clear failed verification counter
    await redis.del(verifyRateLimitKey);

    // 7. Create Signed JWT Session Token
    const token = await createSessionToken({ email });

    // 8. Set Secure HTTP-Only Session Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Successfully verified and logged in.',
    });

    response.cookies.set({
      ...SESSION_COOKIE_OPTIONS,
      value: token,
    });

    return response;
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

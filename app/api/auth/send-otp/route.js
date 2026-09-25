import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { sendOtpEmail } from '@/lib/mailer';
import { normalizeEmail, isValidEmail, generateSecureOtp, hashOtp } from '@/lib/utils';

// Constants
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const SEND_RATE_LIMIT_MAX = 3; // Max 3 requests
const SEND_RATE_LIMIT_WINDOW = 900; // 15 minutes window in seconds

export async function POST(request) {
  try {
    const body = await request.json();
    const rawEmail = body.email;

    // 1. Normalize and Validate Email
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();

    // 2. Check Send Rate Limit in Redis (Max 3 sends per 15 min)
    const rateLimitKey = `ratelimit:send:${email}`;
    const currentSendAttempts = await redis.incr(rateLimitKey);

    if (currentSendAttempts === 1) {
      // First attempt in this window, set TTL
      await redis.expire(rateLimitKey, SEND_RATE_LIMIT_WINDOW);
    }

    if (currentSendAttempts > SEND_RATE_LIMIT_MAX) {
      const ttl = await redis.ttl(rateLimitKey);
      const minutesLeft = Math.ceil((ttl > 0 ? ttl : SEND_RATE_LIMIT_WINDOW) / 60);
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${minutesLeft} minute(s).` },
        { status: 429 }
      );
    }

    // 3. Generate Cryptographically Secure 6-digit OTP & Hash It
    const plainOtp = generateSecureOtp();
    const hashedOtp = hashOtp(plainOtp);

    // 4. Store Hashed OTP in Redis with 5-minute Expiry (TTL)
    const otpKey = `otp:${email}`;
    await redis.set(otpKey, hashedOtp, { ex: OTP_EXPIRY_SECONDS });

    // 5. Send Email via Mailer (Gmail SMTP or Resend fallback)
    try {
      await sendOtpEmail({ to: email, otp: plainOtp });
    } catch (deliveryError) {
      console.error('Email delivery error:', deliveryError);
      return NextResponse.json(
        { error: 'Failed to deliver verification email. Please check your email configuration.' },
        { status: 500 }
      );
    }

    // 6. Respond with Success (NEVER expose the OTP in response!)
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { getResendClient } from '@/lib/resend';
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
    const resend = getResendClient();

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

    // 5. Send Email via Resend
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'OTP Login <onboarding@resend.dev>';

    const { error: emailError } = await resend.emails.send({
      from: senderEmail,
      to: email,
      subject: `Your Login Code: ${plainOtp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #111827; margin-bottom: 8px;">Your Verification Code</h2>
          <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">Use the 6-digit verification code below to complete your login. This code is valid for <strong>5 minutes</strong>.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; font-family: monospace;">${plainOtp}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
            If you did not request this login code, you can safely ignore this email. Someone may have mistyped their email address.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend delivery error:', emailError);
      return NextResponse.json(
        { error: 'Failed to deliver verification email. Please check your configuration.' },
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

import nodemailer from 'nodemailer';
import { getResendClient } from './resend';

/**
 * Sends OTP email using Gmail SMTP if credentials exist, otherwise falls back to Resend.
 * @param {{ to: string, otp: string }} params
 */
export async function sendOtpEmail({ to, otp }) {
  const gmailUser = process.env.EMAIL_USER;
  const gmailPass = process.env.EMAIL_PASS;

  // HTML email template
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #111827; margin-bottom: 8px;">Your Verification Code</h2>
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">Use the 6-digit verification code below to complete your login. This code is valid for <strong>5 minutes</strong>.</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; font-family: monospace;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
        If you did not request this login code, you can safely ignore this email. Someone may have mistyped their email address.
      </p>
    </div>
  `;

  // 1. If Gmail credentials are provided, use Gmail SMTP (Sends to ANY email for free!)
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass.replace(/\s+/g, ''), // Remove any spaces from app password
      },
    });

    await transporter.sendMail({
      from: `"OTP Login" <${gmailUser}>`,
      to,
      subject: `Your Login Code: ${otp}`,
      html: htmlContent,
    });
    return { success: true };
  }

  // 2. Fallback to Resend
  const resend = getResendClient();
  const senderEmail = process.env.RESEND_FROM_EMAIL || 'OTP Login <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from: senderEmail,
    to,
    subject: `Your Login Code: ${otp}`,
    html: htmlContent,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email via Resend');
  }

  return { success: true };
}

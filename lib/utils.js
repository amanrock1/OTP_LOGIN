import crypto from 'crypto';

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 * This prevents rate-limit bypasses and duplicate Redis keys (e.g. "User@domain.com" vs "user@domain.com").
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates standard email address format using a regular expression.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Uses crypto.randomInt (100000 to 999999 inclusive) to avoid Math.random bias.
 * @returns {string}
 */
export function generateSecureOtp() {
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

/**
 * Computes a SHA-256 hash of the OTP string.
 * This ensures plain OTPs are never stored in Redis.
 * @param {string} otp
 * @returns {string} Hex encoded hash
 */
export function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

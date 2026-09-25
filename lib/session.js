import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'otp_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Returns Uint8Array encoded secret key for jose Web Crypto operations.
 * Works uniformly in Node.js and Edge runtimes.
 */
function getSecretKey() {
  const secret = process.env.SESSION_SECRET || 'dev_secret_key_must_be_at_least_32_chars_long!';
  return new TextEncoder().encode(secret);
}

/**
 * Creates and cryptographically signs a JWT session token.
 * @param {{ email: string }} payload
 * @returns {Promise<string>} Signed JWT string
 */
export async function createSessionToken(payload) {
  const secretKey = getSecretKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/**
 * Verifies the JWT signature and expiration.
 * @param {string} token
 * @returns {Promise<{ email: string } | null>} Decoded payload or null if invalid
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    // Return null if token is tampered, expired, or malformed
    return null;
  }
}

/**
 * Standard cookie configuration options for session persistence.
 */
export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true, // Prevents JavaScript from reading the cookie (protects against XSS)
  secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
  sameSite: 'lax', // Protects against CSRF attacks
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

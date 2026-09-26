import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'otp_session';
// 20 minutes inactivity timeout (20 minutes * 60 seconds)
export const INACTIVITY_TIMEOUT_SECONDS = 20 * 60; // 1200 seconds

/**
 * Returns Uint8Array encoded secret key for jose Web Crypto operations.
 */
function getSecretKey() {
  const secret = process.env.SESSION_SECRET || 'dev_secret_key_must_be_at_least_32_chars_long!';
  return new TextEncoder().encode(secret);
}

/**
 * Creates and cryptographically signs a JWT session token with a 20-minute lifespan.
 * @param {{ email: string }} payload
 * @returns {Promise<string>} Signed JWT string
 */
export async function createSessionToken(payload) {
  const secretKey = getSecretKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${INACTIVITY_TIMEOUT_SECONDS}s`) // Expires after 20 minutes of inactivity
    .sign(secretKey);
}

/**
 * Verifies the JWT signature and expiration.
 * @param {string} token
 * @returns {Promise<{ email: string } | null>} Decoded payload or null if expired/invalid
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
    // Return null if token is expired (past 20 minutes), tampered, or malformed
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
  maxAge: INACTIVITY_TIMEOUT_SECONDS, // 20 minutes cookie maxAge
};

import { Resend } from 'resend';

let resendClient = null;

/**
 * Lazily initializes and returns the Resend client instance.
 * Avoids throwing errors during Next.js static build evaluation when env vars are not yet populated.
 * @returns {Resend}
 */
export function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable.');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

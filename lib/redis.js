import { Redis } from '@upstash/redis';

let redisClient = null;

/**
 * Lazily initializes and returns the Upstash Redis client instance.
 * Avoids throwing errors during Next.js static build evaluation when env vars are not yet populated.
 * @returns {Redis}
 */
export function getRedisClient() {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'Missing Upstash Redis environment variables (UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN).'
      );
    }
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

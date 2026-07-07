import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Falls back to an in-memory limiter when Upstash env vars aren't configured,
// so local dev keeps working without an Upstash account. In-memory state
// doesn't survive serverless cold starts or scale across instances — set
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in production.
const memoryStore = new Map<string, number[]>();

export function createRateLimiter(prefix: string, limit: number, windowSeconds: number) {
  const durable = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `ratelimit:${prefix}`,
      })
    : null;

  return {
    /** Returns true when the caller is rate-limited. */
    async check(key: string): Promise<boolean> {
      if (durable) {
        const { success } = await durable.limit(key);
        return !success;
      }
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      const timestamps = (memoryStore.get(key) ?? []).filter(t => now - t < windowMs);
      if (timestamps.length >= limit) return true;
      timestamps.push(now);
      memoryStore.set(key, timestamps);
      return false;
    },
  };
}

export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

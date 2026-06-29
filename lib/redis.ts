import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client (REST/HTTP transport — no TCP connection pool,
 * which is the correct choice for serverless functions).
 *
 * This is `null` whenever the Upstash env vars are absent (e.g. local dev
 * without credentials). Every consumer MUST treat `redis === null` as
 * "skip the cache / fall back to the source of truth" and never throw — the
 * app has to keep working with Redis unavailable, exactly like it did before
 * this layer existed.
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

type RateLimitEntry = { count: number; resetAt: number }

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number
  /** Window duration in milliseconds. */
  windowMs: number
}

/**
 * Simple in-memory rate limiter keyed on an arbitrary identifier (e.g. an IP address).
 * Returns `allowed: false` once the limit is exceeded within the current window.
 *
 * Note: resets per-process and does not coordinate across serverless instances.
 * Prefer `checkRateLimitAsync` (Upstash-backed) for accurate cross-instance limits;
 * this remains the automatic fallback when Redis is unavailable.
 */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): { allowed: boolean } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  entry.count += 1
  if (entry.count > limit) return { allowed: false }
  return { allowed: true }
}

// ─── Cross-instance limiter (Upstash) ────────────────────────────────────────

// Cache one Ratelimit instance per (limit, window) pair so we don't rebuild it
// on every request.
const limiters = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${limit}:${windowMs}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      // Sliding window matches the in-memory fallback's intent closely.
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: 'rl',
    })
    limiters.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Cross-instance rate limit backed by Upstash Redis. Falls back to the in-memory
 * limiter (per-instance only) when Redis is unavailable or errors, so callers
 * always get a sane answer.
 */
export async function checkRateLimitAsync(
  key: string,
  options: RateLimitOptions,
): Promise<{ allowed: boolean }> {
  const limiter = getLimiter(options.limit, options.windowMs)
  if (!limiter) return checkRateLimit(key, options)

  try {
    const { success } = await limiter.limit(key)
    return { allowed: success }
  } catch {
    // Redis hiccup — degrade to per-instance limiting rather than failing the request.
    return checkRateLimit(key, options)
  }
}

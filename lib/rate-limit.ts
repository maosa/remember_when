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
 * Note: resets per-process. For multi-instance deployments, pair with an
 * external store (Redis / Upstash) for accurate cross-instance limiting.
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

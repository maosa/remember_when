import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit, checkRateLimitAsync } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit, then blocks', () => {
    const key = 'user-a'
    const opts = { limit: 3, windowMs: 1000 }

    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(false)
  })

  it('resets the count once the window elapses', () => {
    const key = 'user-b'
    const opts = { limit: 1, windowMs: 1000 }

    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(false)

    vi.advanceTimersByTime(1000)

    expect(checkRateLimit(key, opts).allowed).toBe(true)
  })

  it('tracks separate keys independently', () => {
    const opts = { limit: 1, windowMs: 1000 }

    expect(checkRateLimit('key-1', opts).allowed).toBe(true)
    expect(checkRateLimit('key-2', opts).allowed).toBe(true)
    expect(checkRateLimit('key-1', opts).allowed).toBe(false)
  })
})

describe('checkRateLimitAsync (Redis-unavailable fallback)', () => {
  // Without Upstash env vars, redis is null, so this must fall back to the
  // in-memory limiter and still enforce the limit per instance.
  it('falls back to in-memory limiting and enforces the limit', async () => {
    const key = 'async-fallback-key'
    const opts = { limit: 2, windowMs: 60_000 }

    expect((await checkRateLimitAsync(key, opts)).allowed).toBe(true)
    expect((await checkRateLimitAsync(key, opts)).allowed).toBe(true)
    expect((await checkRateLimitAsync(key, opts)).allowed).toBe(false)
  })
})

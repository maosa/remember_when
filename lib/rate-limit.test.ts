import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

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

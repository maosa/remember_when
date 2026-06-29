import { describe, it, expect } from 'vitest'
import {
  sigKey,
  unreadKey,
  prefsKey,
  reminderLastKey,
  getCachedSignedUrl,
  getCachedSignedUrls,
  cacheSignedUrls,
  getCachedUnread,
  setCachedUnread,
  invalidateUnread,
  getCachedPrefs,
  setCachedPrefs,
  invalidatePrefs,
  getCachedLastReminders,
  setLastReminders,
} from '@/lib/cache'

// These tests run without Upstash env vars, so `redis` is null. They lock in the
// key schemes and verify every helper degrades gracefully (no throw, cache-miss
// result) when Redis is unavailable — the contract every call site relies on.

describe('cache key builders', () => {
  it('namespaces each key type', () => {
    expect(sigKey('post-media/m/p/0.jpg')).toBe('sig:post-media/m/p/0.jpg')
    expect(unreadKey('user-1')).toBe('unread:user-1')
    expect(prefsKey('user-1')).toBe('prefs:user-1')
    expect(reminderLastKey('user-1')).toBe('reminder:last:user-1')
  })
})

describe('cache helpers with Redis unavailable', () => {
  it('signed-URL reads miss and writes no-op', async () => {
    expect(await getCachedSignedUrl('post-media/a/0.jpg')).toBeNull()
    expect(await getCachedSignedUrls(['post-media/a/0.jpg'])).toEqual(new Map())
    await expect(cacheSignedUrls([['post-media/a/0.jpg', 'https://signed']], 1000)).resolves.toBeUndefined()
  })

  it('unread count reads miss and writes/invalidations no-op', async () => {
    expect(await getCachedUnread('user-1')).toBeNull()
    await expect(setCachedUnread('user-1', 5)).resolves.toBeUndefined()
    await expect(invalidateUnread('user-1')).resolves.toBeUndefined()
    await expect(invalidateUnread(['user-1', 'user-2'])).resolves.toBeUndefined()
    await expect(invalidateUnread([])).resolves.toBeUndefined()
  })

  it('prefs reads miss and writes/invalidations no-op', async () => {
    expect(await getCachedPrefs<unknown>(['user-1'])).toEqual(new Map())
    await expect(setCachedPrefs([['user-1', { new_post: true }]])).resolves.toBeUndefined()
    await expect(invalidatePrefs('user-1')).resolves.toBeUndefined()
  })

  it('reminder markers read miss and writes no-op', async () => {
    expect(await getCachedLastReminders(['user-1'])).toEqual(new Map())
    await expect(setLastReminders(['user-1'], new Date().toISOString())).resolves.toBeUndefined()
    await expect(setLastReminders([], new Date().toISOString())).resolves.toBeUndefined()
  })
})

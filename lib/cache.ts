/**
 * Centralised Redis cache helpers: key naming, TTLs, and small typed wrappers
 * around the Upstash client. Keeping these in one place means TTLs and key
 * schemes never drift across call sites.
 *
 * Every helper is a no-op (or returns an empty/cache-miss result) when Redis is
 * unavailable — see `lib/redis.ts`. None of them throw: a cache layer must never
 * be able to take down a request, so all Redis calls are wrapped in try/catch.
 */
import { redis } from './redis'

// ─── TTLs (seconds) ────────────────────────────────────────────────────────────

/** Unread-count cache. Short — it's a safety net; writes invalidate it explicitly. */
export const UNREAD_TTL = 60
/** Notification-preferences cache. Prefs change rarely and are invalidated on update. */
export const PREFS_TTL = 60 * 60 // 1h
/** Cron last-reminder marker. Long-lived; just an optimisation over the DB scan. */
export const REMINDER_LAST_TTL = 60 * 60 * 24 * 90 // 90d

// ─── Key builders ────────────────────────────────────────────────────────────

/** Signed-URL cache, keyed by the "{bucket}/{path}" storage reference. */
export const sigKey = (bucketPath: string) => `sig:${bucketPath}`
export const unreadKey = (userId: string) => `unread:${userId}`
export const prefsKey = (userId: string) => `prefs:${userId}`
export const reminderLastKey = (userId: string) => `reminder:last:${userId}`

// ─── Signed URLs (strings) ──────────────────────────────────────────────────

export async function getCachedSignedUrl(bucketPath: string): Promise<string | null> {
  if (!redis) return null
  try {
    return await redis.get<string>(sigKey(bucketPath))
  } catch {
    return null
  }
}

/** Batch fetch. Returns a Map of bucketPath → signedUrl for hits only. */
export async function getCachedSignedUrls(bucketPaths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!redis || bucketPaths.length === 0) return map
  try {
    const vals = await redis.mget<(string | null)[]>(...bucketPaths.map(sigKey))
    bucketPaths.forEach((p, i) => {
      const v = vals[i]
      if (v) map.set(p, v)
    })
  } catch {
    /* cache miss — caller signs from source */
  }
  return map
}

/** Backfill the signed-URL cache. `ttl` must stay below the signature's own expiry. */
export async function cacheSignedUrls(entries: [string, string][], ttl: number): Promise<void> {
  if (!redis || entries.length === 0 || ttl <= 0) return
  try {
    const pipe = redis.pipeline()
    for (const [bucketPath, url] of entries) {
      pipe.set(sigKey(bucketPath), url, { ex: ttl })
    }
    await pipe.exec()
  } catch {
    /* best-effort */
  }
}

// ─── Unread notification count ───────────────────────────────────────────────

export async function getCachedUnread(userId: string): Promise<number | null> {
  if (!redis) return null
  try {
    return await redis.get<number>(unreadKey(userId))
  } catch {
    return null
  }
}

export async function setCachedUnread(userId: string, count: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(unreadKey(userId), count, { ex: UNREAD_TTL })
  } catch {
    /* best-effort */
  }
}

/** Drop the cached unread count for one or more users (call on any read/insert). */
export async function invalidateUnread(userIds: string | string[]): Promise<void> {
  if (!redis) return
  const ids = Array.isArray(userIds) ? userIds : [userIds]
  if (ids.length === 0) return
  try {
    await redis.del(...ids.map(unreadKey))
  } catch {
    /* best-effort */
  }
}

// ─── Notification preferences ────────────────────────────────────────────────

/** Batch fetch cached prefs rows. Returns a Map of userId → row for hits only. */
export async function getCachedPrefs<T>(userIds: string[]): Promise<Map<string, T>> {
  const map = new Map<string, T>()
  if (!redis || userIds.length === 0) return map
  try {
    const vals = await redis.mget<(T | null)[]>(...userIds.map(prefsKey))
    userIds.forEach((id, i) => {
      const v = vals[i]
      if (v != null) map.set(id, v)
    })
  } catch {
    /* cache miss — caller reads from DB */
  }
  return map
}

export async function setCachedPrefs<T>(entries: [string, T][]): Promise<void> {
  if (!redis || entries.length === 0) return
  try {
    const pipe = redis.pipeline()
    for (const [id, val] of entries) {
      pipe.set(prefsKey(id), val, { ex: PREFS_TTL })
    }
    await pipe.exec()
  } catch {
    /* best-effort */
  }
}

export async function invalidatePrefs(userId: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(prefsKey(userId))
  } catch {
    /* best-effort */
  }
}

// ─── Cron: last-reminder markers ─────────────────────────────────────────────

/** Batch fetch last-reminder ISO timestamps. Returns a Map of userId → iso for hits only. */
export async function getCachedLastReminders(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!redis || userIds.length === 0) return map
  try {
    const vals = await redis.mget<(string | null)[]>(...userIds.map(reminderLastKey))
    userIds.forEach((id, i) => {
      const v = vals[i]
      if (v) map.set(id, v)
    })
  } catch {
    /* cache miss — caller reads from DB */
  }
  return map
}

/** Record that reminders were just sent to these users. */
export async function setLastReminders(userIds: string[], iso: string): Promise<void> {
  if (!redis || userIds.length === 0) return
  try {
    const pipe = redis.pipeline()
    for (const id of userIds) {
      pipe.set(reminderLastKey(id), iso, { ex: REMINDER_LAST_TTL })
    }
    await pipe.exec()
  } catch {
    /* best-effort */
  }
}

/**
 * Storage utilities for private Supabase Storage buckets.
 *
 * Storage paths in the DB follow the "{bucket}/{path}" convention, e.g.:
 *   "moment-covers/uuid/cover.jpg"
 *   "post-media/moment-uuid/post-uuid/0.jpg"
 *
 * (The "avatars" bucket remains public — profile photos don't need signing.)
 *
 * Signed URLs are generated server-side using the service role key so they
 * bypass storage RLS. They expire after 24 hours.
 */

import { createAdminClient } from './supabase/admin'
import { cacheSignedUrls, getCachedSignedUrl, getCachedSignedUrls } from './cache'

// Cache signed URLs for an hour less than their own validity so a cached URL
// can never be served past its expiry.
const SIGNED_URL_CACHE_BUFFER = 3_600

const DEFAULT_EXPIRY_SECONDS = 86_400 // 24 hours

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Parses a "{bucket}/{path}" storage reference into its components.
 * Returns null if the value is not in the expected format (e.g. an old public URL).
 */
export function parseBucketPath(storagePath: string): { bucket: string; path: string } | null {
  const idx = storagePath.indexOf('/')
  if (idx === -1) return null
  return {
    bucket: storagePath.slice(0, idx),
    path: storagePath.slice(idx + 1),
  }
}

// ─── Signed URL generation ────────────────────────────────────────────────────

/**
 * Generates a single signed URL for a "{bucket}/{path}" storage reference.
 * Returns null if the path is invalid or signing fails.
 */
export async function signStoragePath(
  storagePath: string,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
): Promise<string | null> {
  const parsed = parseBucketPath(storagePath)
  if (!parsed) return null

  const cached = await getCachedSignedUrl(storagePath)
  if (cached) return cached

  const admin = createAdminClient()
  const { data } = await admin.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn)

  const url = data?.signedUrl ?? null
  if (url) await cacheSignedUrls([[storagePath, url]], expiresIn - SIGNED_URL_CACHE_BUFFER)
  return url
}

/**
 * Batch-generates signed URLs for multiple "{bucket}/{path}" references.
 * Paths are grouped by bucket so each bucket only gets one API call.
 * Returns a Map of storagePath → signedUrl.
 *
 * Paths that fail to sign are omitted from the result.
 */
export async function signStoragePaths(
  storagePaths: string[],
  expiresIn = DEFAULT_EXPIRY_SECONDS,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const unique = [...new Set(storagePaths.filter(Boolean))]
  if (unique.length === 0) return result

  // Serve any cache hits first, then only sign the misses.
  const cached = await getCachedSignedUrls(unique)
  for (const [path, url] of cached) result.set(path, url)
  const misses = unique.filter((p) => !result.has(p))
  if (misses.length === 0) return result

  // Group the misses by bucket so each bucket gets a single signing call.
  const byBucket = new Map<string, string[]>()
  for (const fullPath of misses) {
    const parsed = parseBucketPath(fullPath)
    if (!parsed) continue
    const list = byBucket.get(parsed.bucket) ?? []
    list.push(parsed.path)
    byBucket.set(parsed.bucket, list)
  }

  const admin = createAdminClient()
  const fresh: [string, string][] = []

  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      const { data } = await admin.storage
        .from(bucket)
        .createSignedUrls(paths, expiresIn)

      if (!data) return
      // Use index-based matching against the input paths array — `item.path`
      // in the API response is unreliable across storage-js versions and may
      // be undefined, which would produce a key of "{bucket}/undefined".
      data.forEach((item, i) => {
        if (item.signedUrl && paths[i]) {
          const fullPath = `${bucket}/${paths[i]}`
          result.set(fullPath, item.signedUrl)
          fresh.push([fullPath, item.signedUrl])
        }
      })
    }),
  )

  // Backfill the cache with the freshly-signed URLs.
  await cacheSignedUrls(fresh, expiresIn - SIGNED_URL_CACHE_BUFFER)

  return result
}

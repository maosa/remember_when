import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cache tag for a user's layout profile (name + avatar).
 * Call revalidateTag with this to bust it after profile mutations.
 */
export function layoutProfileTag(userId: string) {
  return `layout-profile-${userId}`
}

/**
 * Cache tag for a user's home-page moments list.
 * Call revalidateTag with this after any mutation that changes which moments
 * the user sees on /home (create, archive, unarchive, delete, leave, transfer).
 */
export function homeMomentsTag(userId: string) {
  return `home-moments-${userId}`
}

/**
 * Cached fetch of the fields the app layout needs to render the nav bar.
 *
 * Two-layer caching:
 *  - React `cache()` — deduplicates within a single server render pass so
 *    multiple components that call this in the same request share one result.
 *  - `unstable_cache` — persists the result across requests in the Next.js
 *    data cache, keyed per userId. Busted via revalidateTag(layoutProfileTag(userId))
 *    after profile mutations.
 *
 * Uses the admin client so there is no cookie dependency inside the cache fn.
 */
export const getLayoutProfile = cache(
  async (userId: string) =>
    unstable_cache(
      async () => {
        const admin = createAdminClient()
        const { data } = await admin
          .from('users')
          .select('first_name, last_name, profile_photo_url, theme')
          .eq('id', userId)
          .single()
        return data
      },
      [layoutProfileTag(userId)],
      { tags: [layoutProfileTag(userId)], revalidate: 3600 },
    )(),
)

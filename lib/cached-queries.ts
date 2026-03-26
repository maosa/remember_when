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
 * Cached fetch of the fields the app layout needs to render the nav bar.
 * Uses the admin client so there is no cookie dependency inside the cache function.
 * Revalidates when the user updates their profile or avatar.
 */
export const getLayoutProfile = (userId: string) =>
  unstable_cache(
    async () => {
      const admin = createAdminClient()
      const { data } = await admin
        .from('users')
        .select('first_name, last_name, profile_photo_url')
        .eq('id', userId)
        .single()
      return data
    },
    [layoutProfileTag(userId)],
    { tags: [layoutProfileTag(userId)] },
  )()

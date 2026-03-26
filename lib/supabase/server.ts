import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * Returns the authenticated user for the current request.
 * Wrapped in React's `cache()` so multiple callers within the same render pass
 * (e.g. layout + page) share a single auth.getUser() network round-trip.
 */
export const getServerUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  )
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { Database } from '@/types/database.types'

/**
 * Returns the authenticated user for the current request.
 * Wrapped in React's `cache()` so multiple callers within the same render pass
 * (e.g. layout + page) share a single auth.getUser() network round-trip.
 */
export const getServerUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})

/**
 * Guard for authenticated server actions / route handlers: returns the current
 * user or redirects to /login when there is no session — collapsing the
 * three-line boilerplate that every protected action would otherwise repeat.
 *
 * Uses the `cache()`-wrapped `getServerUser()` so the auth round-trip is shared
 * with any other caller in the same request. Actions that also need the
 * user-scoped (RLS-bound) client create it separately via `createClient()`.
 *
 * `redirect()` throws internally, so the return value is always non-null.
 */
export async function requireUser() {
  const { data: { user } } = await getServerUser()
  if (!user) redirect('/login')
  return user
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
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

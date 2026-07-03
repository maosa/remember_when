'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

/**
 * Shared chrome for public pages that must adapt to auth state (pricing, terms,
 * privacy). Renders the exact same header the rest of the app uses:
 *   - authenticated → fixed AppNav (Home/Friends + bell/avatar), content flows behind it
 *   - signed out    → guest header (logo + Sign in / Get started)
 *   - loading        → neutral placeholder to avoid a header flash
 * and applies the canonical content offset (md:pt-14 pb-20 md:pb-0) from
 * app/(app)/layout.tsx so content clears the fixed top bar (desktop) and the
 * fixed bottom tab bar (mobile).
 */

export type SitePageAuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: { firstName: string; lastName: string; photoUrl: string | null }; unreadCount: number }

const SitePageAuthContext = createContext<SitePageAuthState>({ status: 'loading' })

/** Read the chrome's auth state (e.g. for a page's own CTA). */
export function useSitePageAuth() {
  return useContext(SitePageAuthContext)
}

export function SitePageChrome({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<SitePageAuthState>({ status: 'loading' })

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setAuth({ status: 'unauthenticated' })
        return
      }

      const [profileRes, unreadRes] = await Promise.all([
        supabase
          .from('users')
          .select('first_name, last_name, profile_photo_url')
          .eq('id', user.id)
          .single(),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
      ])

      setAuth({
        status: 'authenticated',
        user: {
          firstName: profileRes.data?.first_name ?? '',
          lastName: profileRes.data?.last_name ?? '',
          photoUrl: profileRes.data?.profile_photo_url ?? null,
        },
        unreadCount: unreadRes.count ?? 0,
      })
    }

    checkAuth()
  }, [])

  const isAuthenticated = auth.status === 'authenticated'

  return (
    <SitePageAuthContext.Provider value={auth}>
      <div className="min-h-screen bg-rw-bg flex flex-col">
        {/* Header — authenticated: full app nav; guest: sign-in/get-started; loading: placeholder */}
        {auth.status === 'loading' && (
          <header className="border-b border-rw-border-subtle bg-rw-bg/95 h-14 shrink-0" />
        )}
        {auth.status === 'unauthenticated' && (
          <header className="border-b border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm shrink-0">
            <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
              <Link href="/" className="font-serif text-[18px] font-semibold tracking-tight">
                Remember When
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  Sign in
                </Link>
                <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
                  Get started
                </Link>
              </div>
            </div>
          </header>
        )}
        {auth.status === 'authenticated' && (
          <AppNav user={auth.user} unreadCount={auth.unreadCount} />
        )}

        {/* Main — offset for fixed AppNav when authenticated */}
        <main className={cn('flex-1', isAuthenticated && 'md:pt-14 pb-20 md:pb-0')}>
          {children}
        </main>
      </div>
    </SitePageAuthContext.Provider>
  )
}

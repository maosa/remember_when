import { redirect } from 'next/navigation'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { getLayoutProfile } from '@/lib/cached-queries'
import { getCachedUnread, setCachedUnread } from '@/lib/cache'
import { DEFAULT_THEME, isThemeSlug } from '@/lib/themes'
import { ThemeSync } from './_components/theme-sync'
import { Toaster } from 'sonner'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: { user } } = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Unread badge count: served from Redis when warm, otherwise counted in
  // Postgres and cached with a short TTL. Mutations that change read-state
  // invalidate the key explicitly, so the TTL is only a drift safety net.
  async function loadUnreadCount(): Promise<number> {
    const cached = await getCachedUnread(user!.id)
    if (cached !== null) return cached

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('read', false)

    const value = count ?? 0
    await setCachedUnread(user!.id, value)
    return value
  }

  const [profile, unreadCount] = await Promise.all([
    getLayoutProfile(user.id),
    loadUnreadCount(),
  ])

  // Apply the user's palette to <html>. Done from this dynamic, auth-gated
  // layout (not the static root layout) so public pages stay static, while
  // still theming the whole document including portals (menus/dialogs/toasts
  // render to <body>). <ThemeSync> handles both the pre-paint no-flash apply on
  // full loads and re-applying across client-side navigation / theme changes.
  const rawTheme = profile?.theme
  const theme = isThemeSlug(rawTheme) ? rawTheme : DEFAULT_THEME

  return (
    <div className="min-h-screen bg-rw-bg">
      <ThemeSync theme={theme} />
      <AppNav
        user={{
          firstName: profile?.first_name ?? '',
          lastName: profile?.last_name ?? '',
          photoUrl: profile?.profile_photo_url ?? null,
        }}
        unreadCount={unreadCount}
      />
      {/* Offset below fixed top nav (desktop) and above bottom tab bar (mobile) */}
      <div className="md:pt-14 pb-20 md:pb-0">
        {children}
      </div>
      {/* mobileOffset clears the fixed bottom tab bar (h-16) on mobile so
          toasts don't overlap it; desktop has no bottom bar. */}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        mobileOffset={{ bottom: '5rem' }}
      />
    </div>
  )
}

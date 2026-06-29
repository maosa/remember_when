import { redirect } from 'next/navigation'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { getLayoutProfile } from '@/lib/cached-queries'
import { getCachedUnread, setCachedUnread } from '@/lib/cache'
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

  return (
    <div className="min-h-screen bg-rw-bg">
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
      <Toaster position="bottom-center" richColors />
    </div>
  )
}

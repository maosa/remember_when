import { redirect } from 'next/navigation'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'
import { getLayoutProfile } from '@/lib/cached-queries'

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

  const [profile, unreadRes] = await Promise.all([
    getLayoutProfile(user.id),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  const unreadCount = unreadRes.count ?? 0

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
    </div>
  )
}

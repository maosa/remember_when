import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/app-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, profile_photo_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        user={{
          firstName: profile?.first_name ?? '',
          lastName: profile?.last_name ?? '',
          photoUrl: profile?.profile_photo_url ?? null,
        }}
      />
      {/* Offset below fixed top nav (desktop) and above bottom tab bar (mobile) */}
      <div className="md:pt-14 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}

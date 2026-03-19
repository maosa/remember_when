import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchHomeMoments } from './actions'
import { MomentsList } from './_components/moments-list'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, { moments }] = await Promise.all([
    supabase
      .from('users')
      .select('first_name')
      .eq('id', user.id)
      .single()
      .then((r) => r.data),
    fetchHomeMoments(),
  ])

  return (
    <main className="min-h-screen">
      <MomentsList
        moments={moments ?? []}
        currentUserId={user.id}
        firstName={profile?.first_name ?? 'there'}
      />
    </main>
  )
}

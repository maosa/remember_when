import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchHomeMoments } from './actions'
import { MomentsList } from './_components/moments-list'

interface Props {
  searchParams: Promise<{ pending_invite?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, { moments }, { pending_invite }] = await Promise.all([
    supabase
      .from('users')
      .select('first_name')
      .eq('id', user.id)
      .single()
      .then((r) => r.data),
    fetchHomeMoments(),
    searchParams,
  ])

  return (
    <main className="min-h-screen">
      {pending_invite === 'true' && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2.5 text-sm text-amber-800 dark:text-amber-300">
            <Bell className="size-4 shrink-0" />
            <span>
              You have a pending moment invitation —{' '}
              <Link href="/notifications" className="font-medium underline underline-offset-2 hover:no-underline">
                check your notifications
              </Link>
              .
            </span>
          </div>
        </div>
      )}
      <MomentsList
        moments={moments ?? []}
        currentUserId={user.id}
        firstName={profile?.first_name ?? 'there'}
      />
    </main>
  )
}

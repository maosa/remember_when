import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { fetchHomeMoments } from './actions'
import { MomentsList } from './_components/moments-list'

interface Props {
  searchParams: Promise<{ pending_invite?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const { data: { user } } = await getServerUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

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
        <div className="bg-rw-blue-subtle border-b border-rw-blue/20">
          <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-3 flex items-center gap-2.5 text-[13px] text-rw-text-primary">
            <Bell className="size-4 shrink-0 text-rw-blue" />
            <span>
              You have a pending moment invitation —{' '}
              <Link
                href="/notifications"
                className="font-medium underline underline-offset-2 hover:no-underline text-rw-blue"
              >
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

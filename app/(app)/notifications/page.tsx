import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { NotificationList } from './_components/notification-list'

export type NotificationRow = {
  id: string
  type: string
  fromUser: { id: string; firstName: string; lastName: string; photoUrl: string | null } | null
  moment: { id: string; name: string } | null
  read: boolean
  createdAt: string
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Mark all unread as read before fetching so the list renders in the correct read state.
  await admin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  // Fetch notifications newest-first.
  const { data: rows } = await admin
    .from('notifications')
    .select('id, type, read, created_at, related_user_id, related_moment_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const fromUserIds = [
    ...new Set((rows ?? []).filter((r) => r.related_user_id).map((r) => r.related_user_id!)),
  ]
  const momentIds = [
    ...new Set((rows ?? []).filter((r) => r.related_moment_id).map((r) => r.related_moment_id!)),
  ]

  const [usersRes, momentsRes] = await Promise.all([
    fromUserIds.length > 0
      ? admin.from('users').select('id, first_name, last_name, profile_photo_url').in('id', fromUserIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; profile_photo_url: string | null }[] }),
    momentIds.length > 0
      ? admin.from('moments').select('id, name').in('id', momentIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const usersMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]))
  const momentsMap = new Map((momentsRes.data ?? []).map((m) => [m.id, m]))

  const notifications: NotificationRow[] = (rows ?? []).map((row) => {
    const u = row.related_user_id ? usersMap.get(row.related_user_id) : null
    const m = row.related_moment_id ? momentsMap.get(row.related_moment_id) : null
    return {
      id: row.id,
      type: row.type,
      fromUser: u
        ? { id: u.id, firstName: u.first_name, lastName: u.last_name, photoUrl: u.profile_photo_url }
        : null,
      moment: m ? { id: m.id, name: m.name } : null,
      read: row.read,
      createdAt: row.created_at,
    }
  })

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <Link
            href="/account/notifications"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            aria-label="Notification settings"
          >
            <Settings className="size-4" />
          </Link>
        </div>

        <NotificationList notifications={notifications} />
      </div>
    </main>
  )
}

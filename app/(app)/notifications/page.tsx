import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { NotificationList } from './_components/notification-list'
import { MarkAllReadButton } from './_components/mark-all-read-button'

export type NotificationRow = {
  id: string
  type: string
  fromUser: { id: string; firstName: string; lastName: string; username: string | null; photoUrl: string | null } | null
  moment: { id: string; name: string } | null
  inviteRole: 'editor' | 'reader' | null
  memberStatus: 'pending' | 'accepted' | 'declined' | null  // current status of the moment_members row
  metadata: Record<string, unknown> | null
  read: boolean
  createdAt: string
}

export default async function NotificationsPage() {
  const { data: { user } } = await getServerUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch notifications newest-first.
  const { data: rows } = await admin
    .from('notifications')
    .select('id, type, read, created_at, related_user_id, related_moment_id, invite_role, metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const fromUserIds = [
    ...new Set((rows ?? []).filter((r) => r.related_user_id).map((r) => r.related_user_id!)),
  ]
  const momentIds = [
    ...new Set((rows ?? []).filter((r) => r.related_moment_id).map((r) => r.related_moment_id!)),
  ]

  // For moment_invite notifications, find the current member status so the UI
  // can show "You accepted/declined" instead of action buttons if already resolved.
  const inviteMomentIds = [
    ...new Set(
      (rows ?? [])
        .filter((r) => r.type === 'moment_invite' && r.related_moment_id)
        .map((r) => r.related_moment_id!)
    ),
  ]

  const [usersRes, momentsRes, memberStatusRes] = await Promise.all([
    fromUserIds.length > 0
      ? admin.from('users').select('id, first_name, last_name, username, profile_photo_url').in('id', fromUserIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; username: string | null; profile_photo_url: string | null }[] }),
    momentIds.length > 0
      ? admin.from('moments').select('id, name, owner_id').in('id', momentIds)
      : Promise.resolve({ data: [] as { id: string; name: string; owner_id: string }[] }),
    inviteMomentIds.length > 0
      ? admin
          .from('moment_members')
          .select('moment_id, status')
          .eq('user_id', user.id)
          .in('moment_id', inviteMomentIds)
      : Promise.resolve({ data: [] as { moment_id: string; status: string }[] }),
  ])

  const usersMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]))
  const momentsMap = new Map((momentsRes.data ?? []).map((m) => [m.id, m]))
  // moment_id → current membership status (for invite notifications)
  const memberStatusMap = new Map((memberStatusRes.data ?? []).map((r) => [r.moment_id, r.status]))
  // moment_id → owner_id (to handle the case where ownership was transferred to this user,
  // which deletes their moment_members row — they should still see "You accepted")
  const momentOwnerMap = new Map((momentsRes.data ?? []).map((m) => [m.id, (m as { id: string; name: string; owner_id: string }).owner_id]))

  const hasUnread = (rows ?? []).some((r) => !r.read)

  const notifications: NotificationRow[] = (rows ?? []).map((row) => {
    const u = row.related_user_id ? usersMap.get(row.related_user_id) : null
    const m = row.related_moment_id ? momentsMap.get(row.related_moment_id) : null
    return {
      id: row.id,
      type: row.type,
      fromUser: u
        ? { id: u.id, firstName: u.first_name, lastName: u.last_name, username: u.username ?? null, photoUrl: u.profile_photo_url }
        : null,
      moment: m ? { id: m.id, name: m.name } : null,
      inviteRole: (row as { invite_role?: 'editor' | 'reader' | null }).invite_role ?? null,
      memberStatus: row.type === 'moment_invite' && row.related_moment_id
        ? // 1st: notification's own stamped response (survives membership row deletion)
          ((row.metadata as { invite_response?: string } | null)?.invite_response as 'accepted' | 'declined' | undefined)
          // 2nd: current moment_members status
          ?? (memberStatusMap.get(row.related_moment_id) as 'pending' | 'accepted' | 'declined' | undefined)
          // 3rd: user is the current owner (transferOwnership deleted their membership row)
          ?? (momentOwnerMap.get(row.related_moment_id) === user.id ? 'accepted' : null)
        : null,
      metadata: (row as { metadata?: Record<string, unknown> | null }).metadata ?? null,
      read: row.read,
      createdAt: row.created_at,
    }
  })

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <div className="flex items-center gap-2">
            {hasUnread && <MarkAllReadButton />}
            <Link
              href="/settings?from=notifications"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
              aria-label="Notification settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>

        <NotificationList notifications={notifications} />
      </div>
    </main>
  )
}

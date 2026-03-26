import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { NotificationsForm, type NotificationPrefs } from './_components/notifications-form'

const DEFAULTS: NotificationPrefs = {
  friendRequestReceived:       true,
  friendRequestAccepted:       true,
  momentInvite:                true,
  momentInviteResponse:        true,
  newPost:                     true,
  memberLeft:                  true,
  ownershipTransferred:        true,
  archivedMomentNotifications: false,
  reminderCadence:             'weekly',
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const backHref = from === 'notifications' ? '/notifications' : '/account'
  const backLabel = from === 'notifications' ? 'Back to notifications' : 'Back to account'
  const { data: { user } } = await getServerUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: row } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const prefs: NotificationPrefs = row
    ? {
        friendRequestReceived:       row.friend_request_received,
        friendRequestAccepted:       row.friend_request_accepted,
        momentInvite:                row.moment_invite,
        momentInviteResponse:        row.moment_invite_response,
        newPost:                     row.new_post,
        memberLeft:                  row.member_left,
        ownershipTransferred:        row.ownership_transferred,
        archivedMomentNotifications: row.archived_moment_notifications,
        reminderCadence:             row.reminder_cadence,
      }
    : DEFAULTS

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10">

        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            aria-label={backLabel}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Notification Preferences</h1>
        </div>

        <NotificationsForm initialPrefs={prefs} />

      </div>
    </main>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationsForm } from './_components/notifications-form'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: prefs } = await supabase
    .from('users')
    .select('notif_new_memory, notif_reactions, notif_reminders, reminder_cadence')
    .eq('id', user!.id)
    .single()

  if (!prefs) redirect('/login')

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            aria-label="Back to account"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Notifications</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          No notifications are firing yet — these settings will take effect when the feature launches.
        </p>

        <NotificationsForm
          initialPrefs={{
            notifNewMemory: prefs.notif_new_memory,
            notifReactions: prefs.notif_reactions,
            notifReminders: prefs.notif_reminders,
            reminderCadence: prefs.reminder_cadence,
          }}
        />

      </div>
    </main>
  )
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BATCH_SIZE = 500

const CADENCE_DAYS: Record<string, number> = {
  weekly:   7,
  biweekly: 14,
  monthly:  30,
}

// Vercel Cron — runs daily at 09:00 UTC (see vercel.json).
// Sends in-app reminder notifications to users whose cadence interval has elapsed.
export async function GET(req: Request) {
  // Guard against unauthorised invocations outside of Vercel Cron.
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const toNotify: string[] = []

  // Process notification_preferences in batches to avoid OOM on large tables.
  let offset = 0
  while (true) {
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('user_id, reminder_cadence')
      .neq('reminder_cadence', 'never')
      .range(offset, offset + BATCH_SIZE - 1)

    if (!prefs || prefs.length === 0) break

    const batchUserIds = prefs.map((p) => p.user_id)

    // Last reminder sent to each user in this batch
    const { data: lastReminders } = await admin
      .from('notifications')
      .select('user_id, created_at')
      .eq('type', 'reminder')
      .in('user_id', batchUserIds)
      .order('created_at', { ascending: false })

    const lastReminderMap = new Map<string, Date>()
    for (const r of lastReminders ?? []) {
      if (!lastReminderMap.has(r.user_id)) {
        lastReminderMap.set(r.user_id, new Date(r.created_at))
      }
    }

    for (const pref of prefs) {
      const lastSent = lastReminderMap.get(pref.user_id)
      if (!lastSent) {
        toNotify.push(pref.user_id)
        continue
      }
      const days = CADENCE_DAYS[pref.reminder_cadence] ?? 7
      const elapsed = (now.getTime() - lastSent.getTime()) / 86_400_000
      if (elapsed >= days) {
        toNotify.push(pref.user_id)
      }
    }

    if (prefs.length < BATCH_SIZE) break
    offset += BATCH_SIZE
  }

  if (toNotify.length > 0) {
    const { error: insertError } = await admin.from('notifications').insert(
      toNotify.map((uid) => ({ user_id: uid, type: 'reminder' }))
    )
    if (insertError) {
      console.error('Cron: failed to insert reminder notifications:', insertError.message)
      return NextResponse.json({ error: 'Failed to insert notifications' }, { status: 500 })
    }
  }

  return NextResponse.json({ sent: toNotify.length })
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron — runs daily at 09:00 UTC (see vercel.json).
// Sends in-app reminder notifications to users whose cadence interval has elapsed.
export async function GET(req: Request) {
  // Guard against unauthorised invocations outside of Vercel Cron.
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // All users who want reminders
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('user_id, reminder_cadence')
    .neq('reminder_cadence', 'never')

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const userIds = prefs.map((p) => p.user_id)

  // Last reminder sent to each user
  const { data: lastReminders } = await admin
    .from('notifications')
    .select('user_id, created_at')
    .eq('type', 'reminder')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  // Build map: userId → most-recent reminder date
  const lastReminderMap = new Map<string, Date>()
  for (const r of lastReminders ?? []) {
    if (!lastReminderMap.has(r.user_id)) {
      lastReminderMap.set(r.user_id, new Date(r.created_at))
    }
  }

  const CADENCE_DAYS: Record<string, number> = {
    weekly:   7,
    biweekly: 14,
    monthly:  30,
  }

  const now = new Date()
  const toNotify: string[] = []

  for (const pref of prefs) {
    const lastSent = lastReminderMap.get(pref.user_id)
    if (!lastSent) {
      // Never received a reminder — send one now
      toNotify.push(pref.user_id)
      continue
    }
    const days = CADENCE_DAYS[pref.reminder_cadence] ?? 7
    const elapsed = (now.getTime() - lastSent.getTime()) / 86_400_000
    if (elapsed >= days) {
      toNotify.push(pref.user_id)
    }
  }

  if (toNotify.length > 0) {
    await admin.from('notifications').insert(
      toNotify.map((uid) => ({ user_id: uid, type: 'reminder' }))
    )
  }

  return NextResponse.json({ sent: toNotify.length })
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const notifNewMemory = formData.get('notif_new_memory') === 'on'
  const notifReactions = formData.get('notif_reactions') === 'on'
  const notifReminders = formData.get('notif_reminders') === 'on'
  const reminderCadence = formData.get('reminder_cadence') as string

  const validCadences = ['weekly', 'biweekly', 'monthly', 'never']
  if (!validCadences.includes(reminderCadence)) {
    return { error: 'Invalid reminder cadence.' }
  }

  const { error } = await supabase
    .from('users')
    .update({
      notif_new_memory: notifNewMemory,
      notif_reactions: notifReactions,
      notif_reminders: notifReminders,
      reminder_cadence: reminderCadence,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account/notifications')
  return { success: true }
}

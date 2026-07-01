'use server'

import { revalidatePath } from 'next/cache'
import { createClient, requireUser } from '@/lib/supabase/server'
import { invalidatePrefs } from '@/lib/cache'

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireUser()
  const supabase = await createClient()

  const cadence = formData.get('reminder_cadence') as 'weekly' | 'biweekly' | 'monthly' | 'never'
  const validCadences = ['weekly', 'biweekly', 'monthly', 'never']
  if (!validCadences.includes(cadence)) return { error: 'Invalid reminder cadence.' }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        friend_request_received:       formData.get('friend_request_received')       === 'on',
        friend_request_accepted:       formData.get('friend_request_accepted')       === 'on',
        moment_invite:                 formData.get('moment_invite')                 === 'on',
        moment_invite_response:        formData.get('moment_invite_response')        === 'on',
        new_post:                      formData.get('new_post')                      === 'on',
        member_left:                   formData.get('member_left')                   === 'on',
        ownership_transferred:         formData.get('ownership_transferred')         === 'on',
        archived_moment_notifications: formData.get('archived_moment_notifications') === 'on',
        reminder_cadence:              cadence,
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }

  await invalidatePrefs(user.id)
  revalidatePath('/settings')
  return { success: true }
}

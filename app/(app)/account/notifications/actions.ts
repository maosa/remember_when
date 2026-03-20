'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cadence = formData.get('reminder_cadence') as string
  const validCadences = ['weekly', 'biweekly', 'monthly', 'never']
  if (!validCadences.includes(cadence)) return { error: 'Invalid reminder cadence.' }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        friend_request_received:     formData.get('friend_request_received')     === 'on',
        friend_request_accepted:     formData.get('friend_request_accepted')     === 'on',
        moment_invite:               formData.get('moment_invite')               === 'on',
        moment_invite_response:      formData.get('moment_invite_response')      === 'on',
        new_post:                    formData.get('new_post')                    === 'on',
        member_left:                 formData.get('member_left')                 === 'on',
        ownership_transferred:       formData.get('ownership_transferred')       === 'on',
        archived_moment_notifications: formData.get('archived_moment_notifications') === 'on',
        reminder_cadence:            cadence,
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/account/notifications')
  return { success: true }
}

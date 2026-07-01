'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateUnread } from '@/lib/cache'

export async function markAllNotificationsAsRead(): Promise<{ error?: string }> {
  const user = await requireUser()

  const admin = createAdminClient()
  const { error } = await admin
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  // Surface the failure so the UI can tell the user the count didn't clear,
  // rather than silently reporting success.
  if (error) return { error: error.message }

  await invalidateUnread(user.id)
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
  return {}
}

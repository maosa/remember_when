'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = (formData.get('firstName') as string).trim()
  const lastName = (formData.get('lastName') as string).trim()
  const username = (formData.get('username') as string).trim().toLowerCase()
  const newEmail = (formData.get('email') as string).trim().toLowerCase()

  if (!firstName || !lastName || !username || !newEmail) {
    return { error: 'All fields are required.' }
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters: letters, numbers, underscores only.' }
  }

  // Check username uniqueness (only if changed)
  const { data: current } = await supabase
    .from('users')
    .select('username, email')
    .eq('id', user.id)
    .single()

  if (current?.username !== username) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return { error: 'Username is already taken.' }
    }
  }

  // Update name + username in the users table
  const { error: profileError } = await supabase
    .from('users')
    .update({ first_name: firstName, last_name: lastName, username })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  // If email changed, trigger Supabase confirmation flow
  const emailChanged = newEmail !== user.email?.toLowerCase()
  if (emailChanged) {
    const origin = (await headers()).get('origin') ?? ''
    const { error: emailError } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${origin}/auth/callback?next=/account` },
    )
    if (emailError) return { error: emailError.message }

    revalidatePath('/account')
    return { success: true, emailPending: true }
  }

  revalidatePath('/account')
  return { success: true, emailPending: false }
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file provided.' }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  // Bust cache by appending timestamp
  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_photo_url: urlWithCacheBust })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/account')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Delete profile row (personal data)
  await supabase.from('users').delete().eq('id', user.id)

  // Sign out first so the session is cleared
  await supabase.auth.signOut()

  // Delete auth user via admin client
  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(user.id)

  redirect('/login')
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Profile (name + username only) ────────────────────────────────────────

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = (formData.get('firstName') as string).trim()
  const lastName  = (formData.get('lastName')  as string).trim()
  const username  = (formData.get('username')  as string).trim().toLowerCase()

  if (!firstName || !lastName || !username) {
    return { error: 'All fields are required.' }
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters: letters, numbers, underscores only.' }
  }

  const { data: current } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  if (current?.username !== username) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) return { error: 'Username is already taken.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ first_name: firstName, last_name: lastName, username })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  return { success: true }
}

// ─── Email (requires re-auth, called after client verifies password) ────────

export async function updateEmail(newEmail: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trimmed = newEmail.trim().toLowerCase()
  if (!trimmed) return { error: 'Email is required.' }

  const origin = (await headers()).get('origin') ?? ''
  const { error } = await supabase.auth.updateUser(
    { email: trimmed },
    { emailRedirectTo: `${origin}/auth/callback?next=/account` },
  )

  if (error) return { error: error.message }

  revalidatePath('/account')
  return { success: true }
}

// ─── Password (requires re-auth, called after client verifies current pwd) ──

export async function changePassword(newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

// ─── Avatar upload ──────────────────────────────────────────────────────────

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

  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_photo_url: urlWithCacheBust })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/account')
  return { success: true }
}

// ─── Avatar remove ──────────────────────────────────────────────────────────

export async function removeAvatar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Clear DB reference first so the UI updates even if storage delete fails
  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_photo_url: null })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  // Best-effort: remove all avatar files for this user from storage
  const { data: files } = await supabase.storage.from('avatars').list(user.id)
  if (files && files.length > 0) {
    await supabase.storage
      .from('avatars')
      .remove(files.map((f) => `${user.id}/${f.name}`))
  }

  revalidatePath('/account')
  return { success: true }
}

// ─── Delete account ─────────────────────────────────────────────────────────

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('users').delete().eq('id', user.id)
  await supabase.auth.signOut()

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(user.id)

  redirect('/login')
}

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, requireUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAvatarMimeType, safeExt, MAX_AVATAR_BYTES, ALLOWED_AVATAR_TYPES } from '@/lib/upload'
import { isValidEmail } from '@/lib/validation'
import { logAuditEvent } from '@/lib/audit'
import { layoutProfileTag } from '@/lib/cached-queries'
import { isThemeSlug } from '@/lib/themes'

// ─── Profile (name + username only) ────────────────────────────────────────

export async function updateProfile(formData: FormData) {
  const user = await requireUser()
  const supabase = await createClient()

  const firstName = (formData.get('firstName') as string).trim().slice(0, 50)
  const lastName  = (formData.get('lastName')  as string).trim().slice(0, 50)
  const username  = (formData.get('username')  as string).trim().toLowerCase().slice(0, 20)

  if (!firstName || !lastName || !username) {
    return { error: 'All fields are required.' }
  }

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters: letters, numbers, underscores only.' }
  }

  // Check username availability — exclude the current user so unchanged usernames pass
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'Username is already taken.' }

  const { error } = await supabase
    .from('users')
    .update({ first_name: firstName, last_name: lastName, username })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidateTag(layoutProfileTag(user.id), { expire: 0 })
  revalidatePath('/account')
  return { success: true }
}

// ─── Theme (platform colour palette) ───────────────────────────────────────

export async function updateTheme(formData: FormData) {
  const user = await requireUser()
  const supabase = await createClient()

  const theme = formData.get('theme')
  if (!isThemeSlug(theme)) {
    return { error: 'Please choose a valid theme.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ theme })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // Busts the layout-profile cache the root layout reads, so router.refresh()
  // re-renders <html> with the new data-theme across the whole app.
  revalidateTag(layoutProfileTag(user.id), { expire: 0 })
  revalidatePath('/account')
  return { success: true }
}

// ─── Email (requires re-auth, called after client verifies password) ────────

export async function updateEmail(newEmail: string) {
  await requireUser()
  const supabase = await createClient()

  const trimmed = newEmail.trim().toLowerCase().slice(0, 254)
  if (!trimmed) return { error: 'Email is required.' }
  if (!isValidEmail(trimmed)) return { error: 'Please enter a valid email address.' }

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
  const user = await requireUser()
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  // Audit log — fire-and-forget
  void logAuditEvent(user.id, 'password_changed')

  return { success: true }
}

// ─── Avatar upload (two-phase direct-to-storage) ──────────────────────────────
//
// The file is uploaded directly to Storage by the browser rather than streamed
// through a Server Action, whose request body is capped at 1 MB by Next.js (and
// ~4.5 MB by Vercel). Mirrors the moment cover-photo flow:
//
//   1. prepareAvatarUpload  — authorises + validates, returns a signed upload URL.
//   2. finalizeAvatarUpload — points users.profile_photo_url at the uploaded object.

/** Canonical avatar extensions derived from the allowed MIME types (jpg/png/webp). */
const AVATAR_EXTS = new Set(ALLOWED_AVATAR_TYPES.map(safeExt))

/**
 * Phase 1 — authorise, validate the file metadata, and return a signed upload
 * URL for the caller's avatar slot ({userId}/avatar.{ext}).
 */
export async function prepareAvatarUpload(
  file: { type: string; size: number },
): Promise<{ error?: string; signedUrl?: string; path?: string }> {
  const user = await requireUser()

  if (!file || file.size === 0) return { error: 'No file provided.' }
  if (file.size > MAX_AVATAR_BYTES) return { error: 'File must be under 10 MB.' }

  const mimeError = validateAvatarMimeType(file.type)
  if (mimeError) return { error: mimeError }

  // Derive the extension from the MIME type, never the filename.
  const ext = safeExt(file.type)
  const path = `${user.id}/avatar.${ext}`

  // User client: storage RLS scopes writes to the caller's own folder. upsert:true
  // so re-uploading an avatar of the same type overwrites the existing object.
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUploadUrl(path, { upsert: true })

  if (error || !data) return { error: error?.message ?? 'Failed to prepare the upload.' }

  return { signedUrl: data.signedUrl, path }
}

/**
 * Phase 2 — called after the browser finishes uploading. Validates the path is
 * the caller's own avatar slot, then points users.profile_photo_url at it.
 */
export async function finalizeAvatarUpload(path: string): Promise<{ error?: string }> {
  const user = await requireUser()

  // Path must be exactly "{userId}/avatar.{ext}" for an allowed extension. The
  // anchored pattern (no '.' or '/' in either capture group) also rules out
  // traversal, so a caller can't point profile_photo_url at a foreign object.
  const match = /^([0-9a-f-]+)\/avatar\.([a-z0-9]+)$/.exec(path)
  if (!match || match[1] !== user.id || !AVATAR_EXTS.has(match[2])) {
    return { error: 'Invalid upload path.' }
  }

  const supabase = await createClient()

  // Avatars bucket is public; store the public URL with a cache-bust so the new
  // image replaces the old one immediately despite the stable path.
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_photo_url: urlWithCacheBust })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidateTag(layoutProfileTag(user.id), { expire: 0 })
  revalidatePath('/account')
  return {}
}

// ─── Avatar remove ──────────────────────────────────────────────────────────

export async function removeAvatar() {
  const user = await requireUser()
  const supabase = await createClient()

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

  revalidateTag(layoutProfileTag(user.id), { expire: 0 })
  revalidatePath('/account')
  return { success: true }
}

// ─── Delete account ─────────────────────────────────────────────────────────

/**
 * Moments the user owns that are shared with other people — i.e. have at least
 * one accepted member (any role). Deleting the account would cascade-delete
 * these moments and every other member's posts/media in them, so ownership must
 * be transferred (or the moment deleted) first.
 *
 * Uses the admin client because moment_members RLS only exposes the caller's own
 * rows; reading other users' accepted memberships requires bypassing RLS.
 */
export async function listOwnedSharedMoments(
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient()

  const { data: ownedMoments } = await admin
    .from('moments')
    .select('id, name')
    .eq('owner_id', userId)

  const owned = ownedMoments ?? []
  if (owned.length === 0) return []

  const { data: acceptedMembers } = await admin
    .from('moment_members')
    .select('moment_id')
    .in('moment_id', owned.map((m) => m.id))
    .eq('status', 'accepted')

  const sharedMomentIds = new Set((acceptedMembers ?? []).map((m) => m.moment_id))

  return owned
    .filter((m) => sharedMomentIds.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function deleteAccount(): Promise<{ error?: string } | void> {
  const user = await requireUser()
  const supabase = await createClient()

  // Guard: refuse to delete while the user still owns moments shared with other
  // people. The account page pre-checks this, but re-verify here in case the
  // client is stale or the state changed after the page rendered.
  const sharedMoments = await listOwnedSharedMoments(user.id)
  if (sharedMoments.length > 0) {
    return {
      error:
        'You still own moments shared with other people. Transfer ownership before deleting your account.',
    }
  }

  // Audit log before deletion so user_id is still valid
  await logAuditEvent(user.id, 'account_deleted')

  await supabase.from('users').delete().eq('id', user.id)
  await supabase.auth.signOut()

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(user.id)

  redirect('/login')
}

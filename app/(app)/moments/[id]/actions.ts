'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification, sendNotifications } from '@/lib/notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentMemberFull = {
  id: string
  userId: string | null
  firstName: string
  lastName: string
  photoUrl: string | null
  invitedEmail: string | null  // set when userId is null (unregistered invitee)
  role: 'editor' | 'reader'
  status: 'pending' | 'accepted' | 'declined'
  invitedBy: string | null
}

export type MomentDetail = {
  id: string
  name: string
  dateYear: number | null
  dateMonth: number | null
  dateDay: number | null
  location: string | null
  coverPhotoUrl: string | null
  ownerId: string
  ownerFirstName: string
  ownerLastName: string
  ownerPhotoUrl: string | null
  createdAt: string
  tags: Array<{ id: string; tag: string }>
  members: MomentMemberFull[]
  inviteLink: { token: string; expiresAt: string | null; createdAt: string } | null
}

// ─── Fetch moment detail ──────────────────────────────────────────────────────

export async function fetchMomentDetail(
  momentId: string
): Promise<{ moment?: MomentDetail; myRole?: 'owner' | 'editor' | 'reader'; myStatus?: 'pending' | 'accepted' | 'declined'; myUserId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('moments')
    .select(`
      id, name, date_year, date_month, date_day, location, cover_photo_url, owner_id, created_at,
      owner:users!moments_owner_id_fkey(id, first_name, last_name, profile_photo_url),
      moment_tags(id, tag),
      moment_members(
        id, user_id, invited_email, role, status, invited_by,
        user:users!moment_members_user_id_fkey(id, first_name, last_name, profile_photo_url)
      )
    `)
    .eq('id', momentId)
    .single()

  if (error || !data) return { error: 'Moment not found.' }

  const isOwner = data.owner_id === user.id
  const rawMembers = (data.moment_members as unknown as Array<{
    id: string
    user_id: string | null
    invited_email: string | null
    role: 'editor' | 'reader'
    status: 'pending' | 'accepted' | 'declined'
    invited_by: string | null
    user: { id: string; first_name: string; last_name: string; profile_photo_url: string | null } | null
  }>)
  const myMembership = rawMembers.find((m) => m.user_id === user.id)

  // Access check — declined members lose access
  if (!isOwner && (!myMembership || myMembership.status === 'declined')) return { error: 'Not found.' }

  // Fetch invite link — only for owners and accepted editors
  const canManageLink =
    isOwner ||
    (myMembership?.role === 'editor' && myMembership?.status === 'accepted')

  let inviteLink: MomentDetail['inviteLink'] = null
  if (canManageLink) {
    const { data: linkData } = await admin
      .from('invite_links')
      .select('token, expires_at, created_at')
      .eq('moment_id', momentId)
      .maybeSingle()
    if (linkData) {
      inviteLink = {
        token: linkData.token as string,
        expiresAt: linkData.expires_at ?? null,
        createdAt: linkData.created_at,
      }
    }
  }

  const owner = data.owner as unknown as { id: string; first_name: string; last_name: string; profile_photo_url: string | null }

  return {
    moment: {
      id: data.id,
      name: data.name,
      dateYear: data.date_year ?? null,
      dateMonth: data.date_month ?? null,
      dateDay: data.date_day ?? null,
      location: data.location ?? null,
      coverPhotoUrl: data.cover_photo_url ?? null,
      ownerId: data.owner_id,
      ownerFirstName: owner.first_name,
      ownerLastName: owner.last_name,
      ownerPhotoUrl: owner.profile_photo_url,
      createdAt: data.created_at,
      tags: (data.moment_tags as unknown as Array<{ id: string; tag: string }>),
      members: rawMembers
        .filter((m) => m.user !== null || m.invited_email !== null)
        .map((m) => ({
          id: m.id,
          userId: m.user_id,
          firstName: m.user?.first_name ?? '',
          lastName: m.user?.last_name ?? '',
          photoUrl: m.user?.profile_photo_url ?? null,
          invitedEmail: m.invited_email ?? null,
          role: m.role,
          status: m.status,
          invitedBy: m.invited_by,
        })),
      inviteLink,
    },
    myRole: isOwner ? 'owner' : myMembership!.role,
    myStatus: myMembership?.status ?? (isOwner ? 'accepted' : 'pending'),
    myUserId: user.id,
  }
}

// ─── Accept invite ────────────────────────────────────────────────────────────

export async function acceptMomentInvite(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { error } = await admin
    .from('moment_members')
    .update({ status: 'accepted' })
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  // Notify the inviter
  const { data: membership } = await admin
    .from('moment_members')
    .select('invited_by')
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .single()

  if (membership?.invited_by) {
    await sendNotification({
      user_id: membership.invited_by,
      type: 'moment_invite_accepted',
      related_user_id: user.id,
      related_moment_id: momentId,
    })
  }

  revalidatePath(`/moments/${momentId}`)
  revalidatePath('/notifications')
  return {}
}

// ─── Decline invite ───────────────────────────────────────────────────────────

export async function declineMomentInvite(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { error } = await admin
    .from('moment_members')
    .update({ status: 'declined' })
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  const { data: membership } = await admin
    .from('moment_members')
    .select('invited_by')
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .single()

  if (membership?.invited_by) {
    await sendNotification({
      user_id: membership.invited_by,
      type: 'moment_invite_declined',
      related_user_id: user.id,
      related_moment_id: momentId,
    })
  }

  revalidatePath(`/moments/${momentId}`)
  revalidatePath('/home')
  revalidatePath('/notifications')
  return {}
}

// ─── Membership upsert helper ─────────────────────────────────────────────────
//
// Handles all cases when adding a user to a moment:
//   - Already accepted → return error (don't downgrade)
//   - Already pending  → return error (already invited)
//   - Previously declined → reset to pending (re-invite)
//   - No row → insert fresh
//
// Returns an error string on failure, or null on success.

async function upsertMembership(
  admin: ReturnType<typeof createAdminClient>,
  momentId: string,
  userId: string,
  role: 'editor' | 'reader',
  invitedBy: string
): Promise<string | null> {
  const { data: existing } = await admin
    .from('moment_members')
    .select('id, status')
    .eq('moment_id', momentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'accepted') return 'This person is already a member of this moment.'
    if (existing.status === 'pending')  return 'This person has already been invited and has not yet responded.'
    // status === 'declined' — re-invite by resetting to pending
    const { error } = await admin
      .from('moment_members')
      .update({ status: 'pending', role, invited_by: invitedBy })
      .eq('id', existing.id)
    if (error) return error.message
    return null
  }

  const { error } = await admin.from('moment_members').insert({
    moment_id: momentId,
    user_id: userId,
    role,
    status: 'pending',
    invited_by: invitedBy,
  })
  if (error) return error.message
  return null
}

// ─── Invite member (post-creation) ───────────────────────────────────────────

export type InviteResult =
  | { error: string }
  | { notFound: true }
  | { success: 'user'; invitedUsername: string }
  | { success: 'email_registered'; invitedUsername: string }
  | { success: 'email_unregistered' }

export async function inviteMember(
  momentId: string,
  method: 'username' | 'email',
  value: string,
  role: 'editor' | 'reader'
): Promise<InviteResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch moment + inviter profile in parallel
  const [{ data: moment }, { data: inviterProfile }] = await Promise.all([
    admin.from('moments').select('owner_id, name').eq('id', momentId).single(),
    admin.from('users').select('username, first_name, last_name').eq('id', user.id).single(),
  ])

  if (!moment) return { error: 'Moment not found.' }

  // Verify current user has permission (owner or accepted editor)
  const isOwner = moment.owner_id === user.id
  if (!isOwner) {
    const { data: myMembership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || myMembership.status !== 'accepted') {
      return { error: 'You do not have permission to invite members.' }
    }
    if (myMembership.role === 'editor' && role === 'editor') {
      return { error: 'Editors can only invite readers.' }
    }
  }

  const inviterUsername = inviterProfile?.username ?? ''
  const inviterFullName = `${inviterProfile?.first_name ?? ''} ${inviterProfile?.last_name ?? ''}`.trim()

  if (method === 'username') {
    const { data: targetUser } = await admin
      .from('users')
      .select('id, username')
      .eq('username', value.toLowerCase().replace(/^@/, ''))
      .maybeSingle()

    if (!targetUser) return { notFound: true }
    if (targetUser.id === user.id) return { error: 'You cannot invite yourself.' }

    const membershipError = await upsertMembership(admin, momentId, targetUser.id, role, user.id)
    if (membershipError) return { error: membershipError }

    await sendInviteNotification({
      admin,
      recipientUserId: targetUser.id,
      inviterUserId: user.id,
      momentId,
      role,
    })

    revalidatePath(`/moments/${momentId}`)
    return { success: 'user', invitedUsername: targetUser.username as string }
  }

  // method === 'email'
  const { data: existingUser } = await admin
    .from('users')
    .select('id, username')
    .eq('email', value.toLowerCase())
    .maybeSingle()

  if (existingUser) {
    if (existingUser.id === user.id) return { error: 'You cannot invite yourself.' }

    const membershipError = await upsertMembership(admin, momentId, existingUser.id, role, user.id)
    if (membershipError) return { error: membershipError }

    await sendInviteNotification({
      admin,
      recipientUserId: existingUser.id,
      inviterUserId: user.id,
      momentId,
      role,
    })

    revalidatePath(`/moments/${momentId}`)
    return { success: 'email_registered', invitedUsername: existingUser.username as string }
  }

  // Unregistered email — create pending moment_members row + send signup invite
  const { error: insertError } = await admin.from('moment_members').insert({
    moment_id: momentId,
    user_id: null,
    invited_email: value.toLowerCase(),
    role,
    status: 'pending',
    invited_by: user.id,
  })
  // Ignore duplicate (already invited at this email for this moment)
  if (insertError && !insertError.message.includes('duplicate')) {
    return { error: insertError.message }
  }

  // Send a sign-up invite email via Supabase Auth.
  // The trigger now skips creating a public.users row for invite-created users
  // (those without a username in their metadata), so this is safe to call.
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(
    value.toLowerCase(),
    {
      redirectTo: `${origin}/auth/invite-confirm`,
      data: {
        inviter_username: inviterUsername,
        inviter_full_name: inviterFullName,
        invited_role: role,
        moment_name: moment.name,
      },
    }
  )

  if (emailError) {
    // Supabase rejects inviteUserByEmail when the email is already in auth.users
    // (e.g. a previous invite created an auth entry but the user never completed
    // their profile). Fall back to the OTP magic-link endpoint which works for
    // existing users and honours a custom redirectTo.
    if (emailError.message.toLowerCase().includes('already been registered')) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const redirectTo = encodeURIComponent(`${origin}/auth/invite-confirm`)
      const otpRes = await fetch(
        `${supabaseUrl}/auth/v1/otp?redirect_to=${redirectTo}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ email: value.toLowerCase(), create_user: false }),
        }
      )
      if (!otpRes.ok) {
        const body = await otpRes.json().catch(() => ({}))
        return { error: `Could not send sign-in link: ${body?.msg ?? otpRes.statusText}` }
      }
      // OTP sent successfully — treat the same as an unregistered invite
    } else {
      return { error: `Could not send invite email: ${emailError.message}` }
    }
  }

  revalidatePath(`/moments/${momentId}`)
  return { success: 'email_unregistered' }
}

// Helper: insert a moment_invite notification with the role attached
async function sendInviteNotification({
  admin,
  recipientUserId,
  inviterUserId,
  momentId,
  role,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
  recipientUserId: string
  inviterUserId: string
  momentId: string
  role: 'editor' | 'reader'
}) {
  // Check preferences (reuse sendNotification logic but we need invite_role)
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('moment_invite')
    .eq('user_id', recipientUserId)
    .maybeSingle()

  if (prefs && prefs.moment_invite === false) return

  await admin.from('notifications').insert({
    user_id: recipientUserId,
    type: 'moment_invite',
    related_user_id: inviterUserId,
    related_moment_id: momentId,
    invite_role: role,
  })
}

// ─── Update member role ───────────────────────────────────────────────────────

export async function updateMemberRole(
  momentId: string,
  memberId: string,
  newRole: 'editor' | 'reader'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id, name')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id !== user.id) return { error: 'Only the owner can change member roles.' }

  const { data: target } = await admin
    .from('moment_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('moment_id', momentId)
    .single()

  if (!target) return { error: 'Member not found.' }
  if (target.role === newRole) return {}

  const { error } = await admin
    .from('moment_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) return { error: error.message }

  // Notify the affected user (if registered)
  if (target.user_id) {
    await sendNotification({
      user_id: target.user_id,
      type: 'role_changed',
      related_user_id: user.id,
      related_moment_id: momentId,
      invite_role: newRole,
    })
  }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Delete moment ────────────────────────────────────────────────────────────

export async function deleteMoment(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id, name')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id !== user.id) return { error: 'Only the owner can delete this moment.' }

  // Fetch accepted members before deletion so we can notify them
  const { data: members } = await admin
    .from('moment_members')
    .select('user_id')
    .eq('moment_id', momentId)
    .eq('status', 'accepted')
    .not('user_id', 'is', null)

  const momentName = moment.name

  const { error } = await admin
    .from('moments')
    .delete()
    .eq('id', momentId)

  if (error) return { error: error.message }

  // Notify former members (moment no longer exists so we store name in metadata)
  const recipientIds = (members ?? [])
    .map((m) => m.user_id as string)
    .filter((id) => id !== user.id)

  if (recipientIds.length > 0) {
    await admin.from('notifications').insert(
      recipientIds.map((uid) => ({
        user_id: uid,
        type: 'moment_deleted',
        related_user_id: user.id,
        metadata: { moment_name: momentName },
      }))
    )
  }

  revalidatePath('/home')
  return {}
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(momentId: string, memberId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }

  const isOwner = moment.owner_id === user.id
  if (!isOwner) {
    // Accepted editors may remove readers only
    const { data: myMembership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .single()

    if (!myMembership || myMembership.status !== 'accepted' || myMembership.role !== 'editor') {
      return { error: 'Only the owner or an editor can remove members.' }
    }

    const { data: target } = await admin
      .from('moment_members')
      .select('role')
      .eq('id', memberId)
      .eq('moment_id', momentId)
      .single()

    if (!target) return { error: 'Member not found.' }
    if (target.role !== 'reader') return { error: 'Editors can only remove readers.' }
  }

  const { error } = await admin
    .from('moment_members')
    .delete()
    .eq('id', memberId)
    .eq('moment_id', momentId)

  if (error) return { error: error.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Update moment details ────────────────────────────────────────────────────

export async function updateMomentDetails(
  momentId: string,
  data: {
    name?: string
    dateYear?: number | null
    dateMonth?: number | null
    dateDay?: number | null
    location?: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moments')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.dateYear !== undefined && { date_year: data.dateYear }),
      ...(data.dateMonth !== undefined && { date_month: data.dateMonth }),
      ...(data.dateDay !== undefined && { date_day: data.dateDay }),
      ...(data.location !== undefined && { location: data.location }),
    })
    .eq('id', momentId)

  if (error) return { error: error.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Update cover photo ───────────────────────────────────────────────────────

export async function updateCoverPhoto(momentId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('cover') as File
  if (!file || file.size === 0) return { error: 'No file provided.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'File must be under 10 MB.' }

  const ext = file.name.split('.').pop()
  const path = `${momentId}/cover.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('moment-covers')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('moment-covers')
    .getPublicUrl(path)

  const urlWithBust = `${publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('moments')
    .update({ cover_photo_url: urlWithBust })
    .eq('id', momentId)

  if (updateError) return { error: updateError.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

export async function setCoverPhotoFromUrl(momentId: string, url: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moments')
    .update({ cover_photo_url: url })
    .eq('id', momentId)

  if (error) return { error: error.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

export async function fetchMomentPhotos(momentId: string): Promise<{ urls: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('post_media')
    .select('storage_url, post:posts!post_media_post_id_fkey(moment_id, deleted_at)')
    .eq('media_type', 'photo')
    .is('deleted_at', null)

  const urls = (data ?? [])
    .filter((row) => {
      const post = row.post as unknown as { moment_id: string; deleted_at: string | null } | null
      return post && post.moment_id === momentId && !post.deleted_at
    })
    .map((row) => row.storage_url)

  return { urls }
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type PostMedia = {
  id: string
  mediaType: 'photo' | 'video' | 'audio'
  storageUrl: string
}

export type PostWithMedia = {
  id: string
  momentId: string
  authorId: string
  authorFirstName: string
  authorLastName: string
  authorPhotoUrl: string | null
  content: string | null
  createdAt: string
  editedAt: string | null
  media: PostMedia[]
}

export async function fetchPosts(
  momentId: string
): Promise<{ posts: PostWithMedia[]; currentUserId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('posts')
    .select(`
      id, moment_id, author_id, content, created_at, edited_at,
      author:users!posts_author_id_fkey(id, first_name, last_name, profile_photo_url),
      post_media(id, media_type, storage_url, deleted_at)
    `)
    .eq('moment_id', momentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error || !data) return { posts: [], currentUserId: user.id }

  const posts = data.map((row) => {
    const author = row.author as unknown as {
      id: string; first_name: string; last_name: string; profile_photo_url: string | null
    }
    const media = (row.post_media as unknown as Array<{
      id: string; media_type: string; storage_url: string; deleted_at: string | null
    }>).filter((m) => !m.deleted_at).map((m) => ({
      id: m.id,
      mediaType: m.media_type as 'photo' | 'video' | 'audio',
      storageUrl: m.storage_url,
    }))

    return {
      id: row.id,
      momentId: row.moment_id,
      authorId: row.author_id,
      authorFirstName: author.first_name,
      authorLastName: author.last_name,
      authorPhotoUrl: author.profile_photo_url,
      content: row.content ?? null,
      createdAt: row.created_at,
      editedAt: (row as unknown as { edited_at: string | null }).edited_at ?? null,
      media,
    }
  })

  return { posts, currentUserId: user.id }
}

export async function createPost(momentId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const content = (formData.get('content') as string | null)?.trim() || null
  const files = formData.getAll('media') as File[]
  const validFiles = files.filter((f) => f && f.size > 0)

  if (!content && validFiles.length === 0) {
    return { error: 'A post must have text or at least one media file.' }
  }

  for (const f of validFiles) {
    if (f.size > 100 * 1024 * 1024) return { error: `${f.name} exceeds the 100 MB limit.` }
  }

  // Verify access: accepted member or owner
  const admin = createAdminClient()
  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }

  const isOwner = moment.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .single()
    if (!membership || membership.status !== 'accepted') {
      return { error: 'You do not have permission to post in this moment.' }
    }
    if (membership.role === 'reader') {
      return { error: 'Readers cannot post in this moment.' }
    }
  }

  // Create post record
  const { data: post, error: postError } = await admin
    .from('posts')
    .insert({ moment_id: momentId, author_id: user.id, content })
    .select('id')
    .single()

  if (postError || !post) return { error: postError?.message ?? 'Failed to create post.' }

  // Upload media files
  if (validFiles.length > 0) {
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${momentId}/${post.id}/${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        // Best-effort cleanup: soft-delete the post
        await admin.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id)
        return { error: `Upload failed: ${uploadError.message}` }
      }

      const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)

      const mediaType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'photo'

      await admin.from('post_media').insert({
        post_id: post.id,
        media_type: mediaType,
        storage_url: publicUrl,
      })
    }
  }

  // Notify accepted members (excluding author) + owner (if not author)
  const { data: members } = await admin
    .from('moment_members')
    .select('user_id')
    .eq('moment_id', momentId)
    .eq('status', 'accepted')
    .neq('user_id', user.id)

  const recipientIds = new Set<string>((members ?? []).map((m) => m.user_id))
  if (moment.owner_id !== user.id) recipientIds.add(moment.owner_id)

  if (recipientIds.size > 0) {
    await sendNotifications(
      Array.from(recipientIds).map((uid) => ({
        user_id: uid,
        type: 'new_post' as const,
        related_user_id: user.id,
        related_moment_id: momentId,
        post_id: post.id,
      }))
    )
  }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

export async function deletePost(postId: string, momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: post } = await admin
    .from('posts')
    .select('author_id, moment_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .single()

  if (!post || post.moment_id !== momentId) return { error: 'Post not found.' }

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  const isAuthor = post.author_id === user.id
  const isMomentOwner = moment?.owner_id === user.id

  let isEditor = false
  if (!isAuthor && !isMomentOwner) {
    const { data: membership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .maybeSingle()
    isEditor = membership?.role === 'editor' && membership?.status === 'accepted'
  }

  if (!isAuthor && !isMomentOwner && !isEditor) {
    return { error: 'You do not have permission to delete this post.' }
  }

  const { error } = await admin
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

export async function editPost(postId: string, momentId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Verify the current user is the author
  const { data: post } = await admin
    .from('posts')
    .select('author_id, moment_id')
    .eq('id', postId)
    .is('deleted_at', null)
    .single()

  if (!post || post.moment_id !== momentId) return { error: 'Post not found.' }
  if (post.author_id !== user.id) return { error: 'Only the author can edit this post.' }

  const content = (formData.get('content') as string | null)?.trim() || null
  const removeMediaIds = formData.getAll('removeMediaId') as string[]
  const newFiles = (formData.getAll('media') as File[]).filter((f) => f && f.size > 0)

  for (const f of newFiles) {
    if (f.size > 100 * 1024 * 1024) return { error: `${f.name} exceeds the 100 MB limit.` }
  }

  // Count remaining media after removals + new uploads
  const { data: existingMedia } = await admin
    .from('post_media')
    .select('id')
    .eq('post_id', postId)
    .is('deleted_at', null)

  const remainingCount = ((existingMedia ?? []).length - removeMediaIds.length) + newFiles.length

  if (!content && remainingCount <= 0) {
    return { error: 'A post must have text or at least one media file.' }
  }

  // Soft-delete removed media items and remove from Storage
  if (removeMediaIds.length > 0) {
    const { data: toRemove } = await admin
      .from('post_media')
      .select('id, storage_url')
      .in('id', removeMediaIds)
      .eq('post_id', postId)

    if (toRemove && toRemove.length > 0) {
      await admin
        .from('post_media')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', removeMediaIds)
        .eq('post_id', postId)

      // Best-effort Storage deletions
      for (const row of toRemove) {
        try {
          const storagePath = row.storage_url.split('/post-media/')[1]?.split('?')[0]
          if (storagePath) {
            await supabase.storage.from('post-media').remove([storagePath])
          }
        } catch {
          // non-fatal
        }
      }
    }
  }

  // Upload new media files
  if (newFiles.length > 0) {
    // Use a timestamp-based offset to avoid collisions with existing files
    const offset = Date.now()
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${momentId}/${postId}/${offset}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, file, { upsert: false })

      if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

      const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)

      const mediaType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'photo'

      await admin.from('post_media').insert({
        post_id: postId,
        media_type: mediaType,
        storage_url: publicUrl,
      })
    }
  }

  // Update post content and edited_at
  const { error } = await admin
    .from('posts')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Manage tags ──────────────────────────────────────────────────────────────

export async function addTag(momentId: string, tag: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = tag.trim().toLowerCase()
  if (!t || t.length > 20) return { error: 'Tag must be 1–20 characters.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('moment_tags')
    .insert({ moment_id: momentId, tag: t, created_by: user.id })

  if (error) return { error: error.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

export async function removeTag(momentId: string, tagId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { error } = await admin
    .from('moment_tags')
    .delete()
    .eq('id', tagId)
    .eq('moment_id', momentId)

  if (error) return { error: error.message }
  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Invite links (shareable) ─────────────────────────────────────────────────

type ExpiryOption = 'week' | 'month' | '3months' | '6months' | 'year' | 'never'

function expiryToDate(expiresIn: ExpiryOption): string | null {
  if (expiresIn === 'never') return null
  const days: Record<string, number> = { week: 7, month: 30, '3months': 90, '6months': 180, year: 365 }
  const d = new Date()
  d.setDate(d.getDate() + days[expiresIn])
  return d.toISOString()
}

async function assertCanManageLink(momentId: string, userId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { data: moment } = await admin.from('moments').select('owner_id').eq('id', momentId).single()
  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id === userId) return {}
  const { data: membership } = await admin
    .from('moment_members')
    .select('role, status')
    .eq('moment_id', momentId)
    .eq('user_id', userId)
    .single()
  if (!membership || membership.status !== 'accepted') return { error: 'Permission denied.' }
  return {}
}

export async function generateInviteLink(
  momentId: string,
  expiresIn: ExpiryOption
): Promise<{ token?: string; expiresAt?: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const permCheck = await assertCanManageLink(momentId, user.id)
  if (permCheck.error) return permCheck

  const admin = createAdminClient()
  const expiresAt = expiryToDate(expiresIn)

  // Delete any existing link (ensures only one active link per moment)
  await admin.from('invite_links').delete().eq('moment_id', momentId)

  const { data, error } = await admin
    .from('invite_links')
    .insert({ moment_id: momentId, created_by: user.id, expires_at: expiresAt })
    .select('token, expires_at')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create link.' }

  revalidatePath(`/moments/${momentId}`)
  return { token: data.token as string, expiresAt: data.expires_at ?? null }
}

export async function revokeInviteLink(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const permCheck = await assertCanManageLink(momentId, user.id)
  if (permCheck.error) return permCheck

  const admin = createAdminClient()
  const { error } = await admin.from('invite_links').delete().eq('moment_id', momentId)
  if (error) return { error: error.message }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Leave moment ─────────────────────────────────────────────────────────────

export async function leaveMoment(
  momentId: string,
  deletePosts: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id === user.id) {
    return { error: 'Transfer ownership before leaving.' }
  }

  const { data: membership } = await admin
    .from('moment_members')
    .select('id')
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'You are not a member of this moment.' }

  if (deletePosts) {
    await admin
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('moment_id', momentId)
      .eq('author_id', user.id)
      .is('deleted_at', null)
  }

  const { error } = await admin.from('moment_members').delete().eq('id', membership.id)
  if (error) return { error: error.message }

  // Notify the owner that someone left
  await sendNotification({
    user_id: moment.owner_id,
    type: 'member_left',
    related_user_id: user.id,
    related_moment_id: momentId,
  })

  revalidatePath('/home')
  return {}
}

// ─── Transfer ownership ───────────────────────────────────────────────────────

export async function transferOwnership(
  momentId: string,
  newOwnerId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id !== user.id) return { error: 'Only the owner can transfer ownership.' }
  if (newOwnerId === user.id) return { error: 'You are already the owner.' }

  const { data: target } = await admin
    .from('moment_members')
    .select('id, role, status')
    .eq('moment_id', momentId)
    .eq('user_id', newOwnerId)
    .single()

  if (!target || target.status !== 'accepted' || target.role !== 'editor') {
    return { error: 'Ownership can only be transferred to an accepted editor.' }
  }

  // Step 1: Insert current owner as accepted editor BEFORE making any other changes.
  // This ensures we never end up in a state where the owner has neither ownership nor membership.
  const { error: insertError } = await admin.from('moment_members').insert({
    moment_id: momentId,
    user_id: user.id,
    role: 'editor',
    status: 'accepted',
    invited_by: user.id,
  })

  if (insertError) return { error: insertError.message }

  // Step 2: Remove the new owner from members (they become the owner via moments.owner_id).
  await admin.from('moment_members').delete().eq('id', target.id)

  // Step 3: Update owner_id.
  const { error } = await admin
    .from('moments')
    .update({ owner_id: newOwnerId })
    .eq('id', momentId)

  if (error) return { error: error.message }

  // Notify the new owner
  await sendNotification({
    user_id: newOwnerId,
    type: 'ownership_transferred',
    related_user_id: user.id,
    related_moment_id: momentId,
  })

  // Notify the previous owner (confirmation)
  await sendNotification({
    user_id: user.id,
    type: 'ownership_transferred_away',
    related_user_id: newOwnerId,
    related_moment_id: momentId,
  })

  revalidatePath(`/moments/${momentId}`)
  revalidatePath('/home')
  return {}
}

// ─── Update moment (name, date, location, tags) ───────────────────────────────

export async function updateMoment(
  momentId: string,
  data: {
    name: string
    dateYear: number | null
    dateMonth: number | null
    dateDay: number | null
    location: string | null
    tags: string[]
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = data.name.trim()
  if (!name) return { error: 'Moment name is required.' }

  const admin = createAdminClient()

  // Verify the caller is owner or an accepted editor
  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }

  const isOwner = moment.owner_id === user.id
  if (!isOwner) {
    const { data: membership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'accepted' || membership.role === 'reader') {
      return { error: 'You do not have permission to edit this moment.' }
    }
  }

  // Update moment row
  const { error: updateError } = await admin
    .from('moments')
    .update({
      name,
      date_year: data.dateYear,
      date_month: data.dateMonth,
      date_day: data.dateDay,
      location: data.location?.trim() || null,
    })
    .eq('id', momentId)

  if (updateError) return { error: updateError.message }

  // Replace tags: delete existing then insert new set
  await admin.from('moment_tags').delete().eq('moment_id', momentId)
  if (data.tags.length > 0) {
    await admin.from('moment_tags').insert(
      data.tags.map((tag) => ({
        moment_id: momentId,
        tag: tag.trim().toLowerCase(),
        created_by: user.id,
      }))
    )
  }

  revalidatePath(`/moments/${momentId}`)
  revalidatePath('/home')
  return {}
}

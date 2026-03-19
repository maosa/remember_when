'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentMemberFull = {
  id: string
  userId: string
  firstName: string
  lastName: string
  photoUrl: string | null
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
}

// ─── Fetch moment detail ──────────────────────────────────────────────────────

export async function fetchMomentDetail(
  momentId: string
): Promise<{ moment?: MomentDetail; myRole?: 'owner' | 'editor' | 'reader'; myStatus?: 'pending' | 'accepted' | 'declined'; error?: string }> {
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
        id, user_id, role, status, invited_by,
        user:users!moment_members_user_id_fkey(id, first_name, last_name, profile_photo_url)
      )
    `)
    .eq('id', momentId)
    .single()

  if (error || !data) return { error: 'Moment not found.' }

  const isOwner = data.owner_id === user.id
  const rawMembers = (data.moment_members as unknown as Array<{
    id: string
    user_id: string
    role: 'editor' | 'reader'
    status: 'pending' | 'accepted' | 'declined'
    invited_by: string | null
    user: { id: string; first_name: string; last_name: string; profile_photo_url: string | null } | null
  }>)
  const myMembership = rawMembers.find((m) => m.user_id === user.id)

  // Access check
  if (!isOwner && !myMembership) return { error: 'Not found.' }

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
        .filter((m) => m.user !== null)
        .map((m) => ({
          id: m.id,
          userId: m.user_id,
          firstName: m.user!.first_name,
          lastName: m.user!.last_name,
          photoUrl: m.user!.profile_photo_url,
          role: m.role,
          status: m.status,
          invitedBy: m.invited_by,
        })),
    },
    myRole: isOwner ? 'owner' : myMembership!.role,
    myStatus: myMembership?.status ?? (isOwner ? 'accepted' : 'pending'),
  }
}

// ─── Accept invite ────────────────────────────────────────────────────────────

export async function acceptMomentInvite(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moment_members')
    .update({ status: 'accepted' })
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  // Notify the inviter
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('moment_members')
    .select('invited_by')
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .single()

  if (membership?.invited_by) {
    await admin.from('notifications').insert({
      user_id: membership.invited_by,
      type: 'moment_invite_accepted',
      from_user_id: user.id,
      moment_id: momentId,
    })
  }

  revalidatePath(`/moments/${momentId}`)
  return {}
}

// ─── Decline invite ───────────────────────────────────────────────────────────

export async function declineMomentInvite(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moment_members')
    .update({ status: 'declined' })
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('moment_members')
    .select('invited_by')
    .eq('moment_id', momentId)
    .eq('user_id', user.id)
    .single()

  if (membership?.invited_by) {
    await admin.from('notifications').insert({
      user_id: membership.invited_by,
      type: 'moment_invite_declined',
      from_user_id: user.id,
      moment_id: momentId,
    })
  }

  revalidatePath(`/moments/${momentId}`)
  revalidatePath('/home')
  return {}
}

// ─── Invite member (post-creation) ───────────────────────────────────────────

export async function inviteMember(
  momentId: string,
  inviteeInput: string,    // userId or email
  role: 'editor' | 'reader'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Verify current user has permission (owner or accepted editor)
  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()

  if (!moment) return { error: 'Moment not found.' }

  const isOwner = moment.owner_id === user.id
  if (!isOwner) {
    const { data: myMembership } = await admin
      .from('moment_members')
      .select('role, status')
      .eq('moment_id', momentId)
      .eq('user_id', user.id)
      .single()

    // Only accepted editors can invite readers; owner can invite anyone
    if (!myMembership || myMembership.status !== 'accepted') {
      return { error: 'You do not have permission to invite members.' }
    }
    // Editors can only invite readers
    if (myMembership.role === 'editor' && role === 'editor') {
      return { error: 'Editors can only invite readers.' }
    }
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeInput)

  if (!isEmail) {
    // Treat as userId
    const { error } = await admin.from('moment_members').upsert(
      { moment_id: momentId, user_id: inviteeInput, role, status: 'pending', invited_by: user.id },
      { onConflict: 'moment_id,user_id', ignoreDuplicates: true }
    )
    if (error) return { error: error.message }

    await admin.from('notifications').insert({
      user_id: inviteeInput,
      type: 'moment_invite',
      from_user_id: user.id,
      moment_id: momentId,
    })
  } else {
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', inviteeInput)
      .maybeSingle()

    if (existingUser) {
      const { error } = await admin.from('moment_members').upsert(
        { moment_id: momentId, user_id: existingUser.id, role, status: 'pending', invited_by: user.id },
        { onConflict: 'moment_id,user_id', ignoreDuplicates: true }
      )
      if (error) return { error: error.message }

      await admin.from('notifications').insert({
        user_id: existingUser.id,
        type: 'moment_invite',
        from_user_id: user.id,
        moment_id: momentId,
      })
    } else {
      const { data: pendingInvite } = await admin
        .from('pending_moment_invites')
        .insert({ moment_id: momentId, email: inviteeInput, role, invited_by: user.id })
        .select('token')
        .single()

      if (pendingInvite) {
        const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
        await admin.auth.admin.inviteUserByEmail(inviteeInput, {
          redirectTo: `${origin}/auth/callback?next=/invite/${pendingInvite.token}`,
        })
      }
    }
  }

  revalidatePath(`/moments/${momentId}`)
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

  if (!moment || moment.owner_id !== user.id) return { error: 'Only the owner can remove members.' }

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

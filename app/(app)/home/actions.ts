'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'
import { signStoragePaths } from '@/lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MomentMember = {
  userId: string
  firstName: string
  lastName: string
  photoUrl: string | null
  role: 'editor' | 'reader'
  status: 'pending' | 'accepted' | 'declined'
}

export type MomentSummary = {
  id: string
  name: string
  dateYear: number | null
  dateMonth: number | null
  dateDay: number | null
  location: string | null
  coverPhotoUrl: string | null
  ownerId: string
  createdAt: string
  tags: string[]
  members: MomentMember[]
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
  isArchived: boolean
}

export type Invitee =
  | { type: 'userId'; value: string; role: 'editor' | 'reader' }
  | { type: 'email'; value: string; role: 'editor' | 'reader' }

// ─── Fetch moments for home page ─────────────────────────────────────────────

export async function fetchHomeMoments(): Promise<{ moments: MomentSummary[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Find all moment IDs where user is an active member (exclude declined invites)
  const { data: myMemberships } = await admin
    .from('moment_members')
    .select('moment_id, role, status')
    .eq('user_id', user.id)
    .neq('status', 'declined')

  const memberMomentIds = (myMemberships ?? []).map((m) => m.moment_id)

  // Fetch all moments user owns or is a member of
  let query = admin
    .from('moments')
    .select(`
      id, name, date_year, date_month, date_day, location, cover_photo_url, owner_id, created_at,
      moment_tags(tag),
      moment_members(
        user_id, role, status,
        user:users!moment_members_user_id_fkey(id, first_name, last_name, profile_photo_url)
      ),
      moment_archive(user_id)
    `)
    .order('created_at', { ascending: false })

  if (memberMomentIds.length > 0) {
    query = query.or(`owner_id.eq.${user.id},id.in.(${memberMomentIds.join(',')})`)
  } else {
    query = query.eq('owner_id', user.id)
  }

  const { data: moments, error } = await query
  if (error) return { moments: [], error: error.message }

  // Batch-sign all cover photo paths (moment-covers and post-media are private buckets)
  const coverPaths = (moments ?? [])
    .map((m) => m.cover_photo_url)
    .filter((p): p is string => Boolean(p))
  const signedCovers = await signStoragePaths(coverPaths)

  const result: MomentSummary[] = (moments ?? []).map((m) => {
    const isOwner = m.owner_id === user.id
    const rawMembers = (m.moment_members as unknown as Array<{
      user_id: string
      role: 'editor' | 'reader'
      status: 'pending' | 'accepted' | 'declined'
      user: { id: string; first_name: string; last_name: string; profile_photo_url: string | null } | null
    }>)
    const myMembership = rawMembers.find((mm) => mm.user_id === user.id)
    const isArchived = (m.moment_archive as unknown as Array<{ user_id: string }>)
      .some((a) => a.user_id === user.id)

    const coverPath = m.cover_photo_url ?? null

    return {
      id: m.id,
      name: m.name,
      dateYear: m.date_year ?? null,
      dateMonth: m.date_month ?? null,
      dateDay: m.date_day ?? null,
      location: m.location ?? null,
      coverPhotoUrl: coverPath ? (signedCovers.get(coverPath) ?? null) : null,
      ownerId: m.owner_id,
      createdAt: m.created_at,
      tags: (m.moment_tags as unknown as Array<{ tag: string }>).map((t) => t.tag),
      members: rawMembers
        .filter((mm) => mm.user !== null)
        .map((mm) => ({
          userId: mm.user_id,
          firstName: mm.user!.first_name,
          lastName: mm.user!.last_name,
          photoUrl: mm.user!.profile_photo_url,
          role: mm.role,
          status: mm.status,
        })),
      myRole: isOwner ? 'owner' : (myMembership?.role ?? 'editor'),
      myStatus: myMembership?.status ?? (isOwner ? 'accepted' : 'pending'),
      isArchived,
    }
  })

  return { moments: result }
}

// ─── Search users to invite ───────────────────────────────────────────────────

export async function searchUsersToInvite(
  query: string,
  excludeIds: string[] = []
): Promise<{ users?: Array<{ id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }>; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const q = query.trim()
  if (q.length < 2) return { users: [] }

  const exclude = [user.id, ...excludeIds]

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, username, profile_photo_url')
    .not('id', 'in', `(${exclude.join(',')})`)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(10)

  if (error) return { error: error.message }

  return {
    users: (data ?? []).map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      photoUrl: u.profile_photo_url,
    })),
  }
}

// ─── Create moment ────────────────────────────────────────────────────────────

export async function createMoment(data: {
  name: string
  dateYear?: number | null
  dateMonth?: number | null
  dateDay?: number | null
  location?: string
  tags: string[]
  invitees: Invitee[]
}): Promise<{ momentId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = data.name.trim().slice(0, 200)
  if (!name) return { error: 'Moment name is required.' }
  const location = data.location?.trim().slice(0, 200) || null

  // Create the moment (user client so RLS owner_id check applies)
  const { data: moment, error: momentError } = await supabase
    .from('moments')
    .insert({
      name,
      date_year: data.dateYear ?? null,
      date_month: data.dateMonth ?? null,
      date_day: data.dateDay ?? null,
      location,
      owner_id: user.id,
    })
    .select('id')
    .single()

  if (momentError || !moment) return { error: momentError?.message ?? 'Failed to create moment.' }

  const admin = createAdminClient()

  // Insert tags
  if (data.tags.length > 0) {
    await admin.from('moment_tags').insert(
      data.tags.map((tag) => ({ moment_id: moment.id, tag: tag.trim(), created_by: user.id }))
    )
  }

  // Fetch current user profile for invite email
  const { data: inviterProfile } = await admin
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const inviterName = inviterProfile
    ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
    : 'Someone'

  // Handle invitees
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  for (const invitee of data.invitees) {
    if (invitee.type === 'userId') {
      await admin.from('moment_members').insert({
        moment_id: moment.id,
        user_id: invitee.value,
        role: invitee.role,
        status: 'pending',
        invited_by: user.id,
      })
      await sendNotification({
        user_id: invitee.value,
        type: 'moment_invite',
        related_user_id: user.id,
        related_moment_id: moment.id,
        invite_role: invitee.role,
      })
    } else {
      // Check if email belongs to an existing user
      const { data: existingUser } = await admin
        .from('users')
        .select('id')
        .eq('email', invitee.value)
        .maybeSingle()

      if (existingUser) {
        await admin.from('moment_members').insert({
          moment_id: moment.id,
          user_id: existingUser.id,
          role: invitee.role,
          status: 'pending',
          invited_by: user.id,
        })
        await sendNotification({
          user_id: existingUser.id,
          type: 'moment_invite',
          related_user_id: user.id,
          related_moment_id: moment.id,
          invite_role: invitee.role,
        })
      } else {
        // Create a pending invite and send a sign-up email
        const { data: pendingInvite } = await admin
          .from('pending_moment_invites')
          .insert({
            moment_id: moment.id,
            email: invitee.value,
            role: invitee.role,
            invited_by: user.id,
          })
          .select('token')
          .single()

        if (pendingInvite) {
          await admin.auth.admin.inviteUserByEmail(invitee.value, {
            data: { invited_by_name: inviterName },
            redirectTo: `${origin}/auth/callback?next=/invite/${pendingInvite.token}`,
          })
        }
      }
    }
  }

  revalidatePath('/home')
  return { momentId: moment.id }
}

// ─── Archive / unarchive ──────────────────────────────────────────────────────

export async function archiveMoment(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moment_archive')
    .insert({ moment_id: momentId, user_id: user.id })

  if (error) return { error: error.message }
  revalidatePath('/home')
  return {}
}

export async function unarchiveMoment(momentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('moment_archive')
    .delete()
    .eq('moment_id', momentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/home')
  return {}
}

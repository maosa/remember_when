'use server'

import { revalidateTag, unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotifications, type NotificationPayload } from '@/lib/notifications'
import { signStoragePaths } from '@/lib/storage'
import { homeMomentsTag } from '@/lib/cached-queries'

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
  ownerFirstName: string
  ownerLastName: string
  ownerPhotoUrl: string | null
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

type RawMember = { user_id: string; role: 'editor' | 'reader'; status: 'pending' | 'accepted' | 'declined' }
type RawOwner = { id: string; first_name: string; last_name: string; profile_photo_url: string | null } | null

/**
 * Inner cached fetch — runs DB queries using the admin client (no cookie
 * dependency) so the result can be stored in the Next.js data cache keyed by
 * userId. The cache is busted via revalidateTag(homeMomentsTag(userId)) after
 * any mutation that changes which moments the user sees on /home.
 */
function fetchHomeMomentsData(userId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      const { data: myMemberships } = await admin
        .from('moment_members')
        .select('moment_id, role, status')
        .eq('user_id', userId)
        .neq('status', 'declined')

      const memberMomentIds = (myMemberships ?? []).map((m) => m.moment_id)
      const safeMemberMomentIds = memberMomentIds.filter((id) => UUID_RE.test(id))

      let query = admin
        .from('moments')
        .select(`
          id, name, date_year, date_month, date_day, location, cover_photo_url, owner_id, created_at,
          owner:users!moments_owner_id_fkey(id, first_name, last_name, profile_photo_url),
          moment_tags(tag),
          moment_members(user_id, role, status)
        `)
        .order('created_at', { ascending: false })

      if (safeMemberMomentIds.length > 0) {
        query = query.or(`owner_id.eq.${userId},id.in.(${safeMemberMomentIds.join(',')})`)
      } else {
        query = query.eq('owner_id', userId)
      }

      const [{ data: moments, error }, { data: archivedRows }] = await Promise.all([
        query,
        admin.from('moment_archive').select('moment_id').eq('user_id', userId),
      ])

      const allMemberIds = [
        ...new Set(
          (moments ?? []).flatMap((m) =>
            (m.moment_members as unknown as RawMember[]).map((mm) => mm.user_id)
          )
        ),
      ]

      const coverPaths = (moments ?? [])
        .map((m) => m.cover_photo_url)
        .filter((p): p is string => Boolean(p))

      const [signedCovers, memberUsersRes] = await Promise.all([
        signStoragePaths(coverPaths),
        allMemberIds.length > 0
          ? admin.from('users').select('id, first_name, last_name, profile_photo_url').in('id', allMemberIds)
          : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string; profile_photo_url: string | null }[] }),
      ])

      return { moments, archivedRows, signedCovers, memberUsers: memberUsersRes.data ?? [], error }
    },
    [`home-moments-${userId}`],
    { tags: [homeMomentsTag(userId)], revalidate: 3600 },
  )()
}

export async function fetchHomeMoments(): Promise<{ moments: MomentSummary[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { moments, archivedRows, signedCovers, memberUsers, error } =
    await fetchHomeMomentsData(user.id)

  const archivedMomentIds = new Set((archivedRows ?? []).map((a) => a.moment_id))
  if (error) return { moments: [], error: error.message }

  const memberUserMap = new Map(memberUsers.map((u) => [u.id, u]))

  const result: MomentSummary[] = (moments ?? []).map((m) => {
    const isOwner = m.owner_id === user.id
    const rawMembers = m.moment_members as unknown as RawMember[]
    const owner = (m as unknown as { owner: RawOwner }).owner
    const myMembership = rawMembers.find((mm) => mm.user_id === user.id)
    const isArchived = archivedMomentIds.has(m.id)
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
      ownerFirstName: owner?.first_name ?? '',
      ownerLastName: owner?.last_name ?? '',
      ownerPhotoUrl: owner?.profile_photo_url ?? null,
      createdAt: m.created_at,
      tags: (m.moment_tags as unknown as Array<{ tag: string }>).map((t) => t.tag),
      members: rawMembers.map((mm) => {
        const u = memberUserMap.get(mm.user_id)
        return {
          userId: mm.user_id,
          firstName: u?.first_name ?? '',
          lastName: u?.last_name ?? '',
          photoUrl: u?.profile_photo_url ?? null,
          role: mm.role,
          status: mm.status,
        }
      }),
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
  // Block characters that could break PostgREST filter syntax inside the .or() string
  if (q.length > 50 || /[,.()\n\r]/.test(q)) return { users: [] }

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

  // Parallelise: tag inserts + inviter profile fetch (neither depends on the other)
  const [, { data: inviterProfile }] = await Promise.all([
    data.tags.length > 0
      ? admin.from('moment_tags').insert(
          data.tags.map((tag) => ({ moment_id: moment.id, tag: tag.trim(), created_by: user.id }))
        )
      : Promise.resolve(null),
    admin.from('users').select('first_name, last_name').eq('id', user.id).single(),
  ])

  const inviterName = inviterProfile
    ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
    : 'Someone'

  // Separate the two invite types up front
  type UserIdInvitee = Extract<Invitee, { type: 'userId' }>
  type EmailInvitee  = Extract<Invitee, { type: 'email' }>
  const userIdInvitees = data.invitees.filter((i): i is UserIdInvitee => i.type === 'userId')
  const emailInvitees  = data.invitees.filter((i): i is EmailInvitee  => i.type === 'email')

  // Accumulate all notification payloads; send in a single batch at the end
  const notificationPayloads: NotificationPayload[] = []

  // ── userId invitees: single batch insert ───────────────────────────────────
  if (userIdInvitees.length > 0) {
    await admin.from('moment_members').insert(
      userIdInvitees.map((i) => ({
        moment_id: moment.id,
        user_id: i.value,
        role: i.role,
        status: 'pending' as const,
        invited_by: user.id,
      }))
    )
    for (const i of userIdInvitees) {
      notificationPayloads.push({
        user_id: i.value,
        type: 'moment_invite',
        related_user_id: user.id,
        related_moment_id: moment.id,
        invite_role: i.role,
      })
    }
  }

  // ── email invitees: parallel lookups, then batched inserts ─────────────────
  if (emailInvitees.length > 0) {
    const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

    // Fan-out: look up all emails in parallel
    const lookupResults = await Promise.all(
      emailInvitees.map((i) =>
        admin.from('users').select('id').eq('email', i.value).maybeSingle()
      )
    )

    type ExistingEntry = { invitee: EmailInvitee; userId: string }
    const existingEntries: ExistingEntry[] = []
    const newEmailInvitees: EmailInvitee[] = []

    for (let k = 0; k < emailInvitees.length; k++) {
      const found = lookupResults[k].data
      if (found) {
        existingEntries.push({ invitee: emailInvitees[k], userId: found.id })
      } else {
        newEmailInvitees.push(emailInvitees[k])
      }
    }

    // Batch-insert for existing users
    if (existingEntries.length > 0) {
      await admin.from('moment_members').insert(
        existingEntries.map(({ invitee, userId }) => ({
          moment_id: moment.id,
          user_id: userId,
          role: invitee.role,
          status: 'pending' as const,
          invited_by: user.id,
        }))
      )
      for (const { invitee, userId } of existingEntries) {
        notificationPayloads.push({
          user_id: userId,
          type: 'moment_invite',
          related_user_id: user.id,
          related_moment_id: moment.id,
          invite_role: invitee.role,
        })
      }
    }

    // New users: insert pending_moment_invites in parallel, then fire email invites in parallel
    if (newEmailInvitees.length > 0) {
      const pendingResults = await Promise.all(
        newEmailInvitees.map((i) =>
          admin.from('pending_moment_invites')
            .insert({ moment_id: moment.id, email: i.value, role: i.role, invited_by: user.id })
            .select('token')
            .single()
        )
      )

      await Promise.all(
        pendingResults.map(({ data: pendingInvite }, k) =>
          pendingInvite
            ? admin.auth.admin.inviteUserByEmail(newEmailInvitees[k].value, {
                data: { invited_by_name: inviterName },
                redirectTo: `${origin}/auth/callback?next=/invite/${pendingInvite.token}`,
              })
            : Promise.resolve()
        )
      )
    }
  }

  // Single batch notification send (one preferences query, one insert)
  await sendNotifications(notificationPayloads)

  revalidateTag(homeMomentsTag(user.id))
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
  revalidateTag(homeMomentsTag(user.id))
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
  revalidateTag(homeMomentsTag(user.id))
  return {}
}

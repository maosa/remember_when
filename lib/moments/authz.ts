/**
 * Authorization + validation helpers shared across the moment server actions.
 *
 * These run with the admin (service-role) client, which bypasses RLS, so every
 * caller MUST gate its writes/reads behind the appropriate check here. Keeping
 * them in one plain module (not a `'use server'` file) means the domain action
 * files can each import exactly the checks they need.
 */
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Read guard: resolves `{}` when the user may view the moment (owner or accepted
 * member), otherwise a generic `Not found.` error so callers cannot distinguish
 * a non-existent moment from one they aren't permitted to see.
 */
export async function assertCanViewMoment(
  momentId: string,
  userId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient()

  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .maybeSingle()

  if (!moment) return { error: 'Not found.' }
  if (moment.owner_id === userId) return {}

  const { data: membership } = await admin
    .from('moment_members')
    .select('status')
    .eq('moment_id', momentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membership?.status === 'accepted') return {}
  return { error: 'Not found.' }
}

/**
 * Write guard: resolves `{ ownerId }` when the user may edit the moment (owner or
 * accepted editor) so callers that need the owner id (cache busting, notifications)
 * can reuse it without a second query. Readers and non-members get an error.
 */
export async function assertCanEditMoment(
  momentId: string,
  userId: string,
): Promise<{ error?: string; ownerId?: string }> {
  const admin = createAdminClient()
  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', momentId)
    .single()
  if (!moment) return { error: 'Moment not found.' }
  if (moment.owner_id === userId) return { ownerId: moment.owner_id }
  const { data: membership } = await admin
    .from('moment_members')
    .select('role, status')
    .eq('moment_id', momentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!membership || membership.status !== 'accepted' || membership.role === 'reader') {
    return { error: 'Permission denied.' }
  }
  return { ownerId: moment.owner_id }
}

/** Invite-link guard: owner or any accepted member may manage the link. */
export async function assertCanManageLink(
  momentId: string,
  userId: string,
): Promise<{ error?: string }> {
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

export type ExpiryOption = 'week' | 'month' | '3months' | '6months' | 'year' | 'never'

/** Converts an invite-link expiry option into an ISO timestamp (or null for "never"). */
export function expiryToDate(expiresIn: ExpiryOption): string | null {
  if (expiresIn === 'never') return null
  const days: Record<string, number> = { week: 7, month: 30, '3months': 90, '6months': 180, year: 365 }
  const d = new Date()
  d.setDate(d.getDate() + days[expiresIn])
  return d.toISOString()
}

/**
 * Validates the path + mediaType of each upload entry the client hands back in
 * the two-phase upload flow (finalizePostUpload / editPost). Guards three
 * invariants: a permitted mediaType literal, no `..` traversal, and a path
 * scoped to `{momentId}/{postId}/` so a caller can't point post_media rows at
 * another user's storage objects. Returns an error string on the first
 * violation, or null when all entries pass.
 */
export function validateUploadPaths(
  entries: Array<{ path: string; mediaType: string }>,
  momentId: string,
  postId: string,
): string | null {
  const ALLOWED_TYPES = new Set(['photo', 'video', 'audio'])
  const expectedPrefix = `${momentId}/${postId}/`

  for (const { path, mediaType } of entries) {
    if (!ALLOWED_TYPES.has(mediaType)) {
      return `Invalid media type: "${mediaType}".`
    }
    if (path.includes('..')) {
      return 'Invalid upload path.'
    }
    if (!path.startsWith(expectedPrefix)) {
      return 'Invalid upload path.'
    }
  }
  return null
}

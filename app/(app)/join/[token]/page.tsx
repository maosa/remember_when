import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Shareable invite-link redemption page.
 *
 * Flow:
 *   1. Verify the user is signed in (redirect to login otherwise).
 *   2. Look up the invite_link by token; reject if missing or expired.
 *   3. If already a member / owner, redirect to the moment.
 *   4. Create a moment_members record (role: reader, status: accepted).
 *   5. Redirect to the moment page.
 *
 * Readers who joined via a later-expired/revoked link retain access —
 * access is stored in moment_members, not tied to the link row.
 */
export default async function JoinViaLinkPage({ params }: Props) {
  const { token } = await params

  // Validate token is a UUID before hitting the DB (prevents unnecessary queries)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_PATTERN.test(token)) redirect('/home?join=invalid')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/join/${token}`)

  const admin = createAdminClient()

  // Look up the invite link
  const { data: link } = await admin
    .from('invite_links')
    .select('id, moment_id, created_by, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!link) redirect('/home?join=invalid')

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    redirect('/home?join=expired')
  }

  // Ensure the user has a profile row (may not exist for brand-new sign-ups)
  const { data: profile } = await admin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect(`/login?error=setup_required&next=/join/${token}`)
  }

  // If already the owner, just go to the moment
  const { data: moment } = await admin
    .from('moments')
    .select('owner_id')
    .eq('id', link.moment_id)
    .single()

  if (moment?.owner_id === user.id) {
    redirect(`/moments/${link.moment_id}`)
  }

  // If already a member (any status), just go to the moment
  const { data: existing } = await admin
    .from('moment_members')
    .select('id')
    .eq('moment_id', link.moment_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/moments/${link.moment_id}`)
  }

  // Join as an accepted reader
  await admin.from('moment_members').insert({
    moment_id: link.moment_id,
    user_id: user.id,
    role: 'reader',
    status: 'accepted',
    invited_by: link.created_by,
  })

  redirect(`/moments/${link.moment_id}`)
}

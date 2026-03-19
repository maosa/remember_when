import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Invite redemption page.
 *
 * Reached after a non-existing user signs up via the Supabase invite email.
 * The auth callback redirects here with /invite/[token].
 *
 * Flow:
 *   1. Verify the signed-in user's email matches the pending invite email.
 *   2. Create a moment_members record (status: pending — they still accept/decline on the moment page).
 *   3. Mark the pending invite as redeemed.
 *   4. Redirect to the moment page.
 */
export default async function InviteRedemptionPage({ params }: Props) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Look up the pending invite
  const { data: invite } = await admin
    .from('pending_moment_invites')
    .select('id, moment_id, email, role, invited_by, redeemed_at')
    .eq('token', token)
    .maybeSingle()

  // Invalid or already redeemed
  if (!invite || invite.redeemed_at) {
    redirect('/home?invite=invalid')
  }

  // Ensure the signed-in user's email matches
  if (!user.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    redirect('/home?invite=mismatch')
  }

  // Ensure the user has a profile row
  const { data: profile } = await admin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    // Profile not set up yet — send back to complete signup
    redirect(`/login?error=setup_required&next=/invite/${token}`)
  }

  // Create the moment_member record (or update if somehow already exists)
  await admin
    .from('moment_members')
    .upsert(
      {
        moment_id: invite.moment_id,
        user_id: user.id,
        role: invite.role as 'editor' | 'reader',
        status: 'pending',
        invited_by: invite.invited_by,
      },
      { onConflict: 'moment_id,user_id' }
    )

  // Notify the inviter
  await admin.from('notifications').insert({
    user_id: invite.invited_by,
    type: 'moment_invite',
    from_user_id: user.id,
    moment_id: invite.moment_id,
  })

  // Mark invite as redeemed
  await admin
    .from('pending_moment_invites')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect(`/moments/${invite.moment_id}`)
}

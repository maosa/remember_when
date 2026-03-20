import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/complete-profile
 *
 * Creates the public.users row for an invite-created user (who authenticated
 * via the Supabase implicit-flow invite link), then resolves any pending
 * moment_members.invited_email rows matching their email.
 *
 * Body: { firstName, lastName, username, password? }
 * Response: { hasPending: boolean } | { error: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { firstName, lastName, username, password } = await request.json()

  if (!firstName || !lastName || !username) {
    return NextResponse.json({ error: 'First name, last name, and username are required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check username is not already taken
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 })
  }

  // Insert the public.users profile row
  const { error: insertError } = await admin.from('users').insert({
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    username: username.toLowerCase(),
    email: user.email,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Optionally update the auth user's password if one was provided
  if (password && password.length >= 8) {
    await admin.auth.admin.updateUserById(user.id, { password })
  }

  // Resolve pending invited_email moment_members rows
  const email = user.email?.toLowerCase() ?? ''
  let hasPending = false

  if (email) {
    const { data: pendingRows } = await admin
      .from('moment_members')
      .select('id, moment_id, role, invited_by')
      .eq('invited_email', email)
      .is('user_id', null)

    if (pendingRows && pendingRows.length > 0) {
      hasPending = true

      await admin
        .from('moment_members')
        .update({ user_id: user.id, invited_email: null })
        .eq('invited_email', email)
        .is('user_id', null)

      const notificationRows = pendingRows.map((row) => ({
        user_id: user.id,
        type: 'moment_invite' as const,
        related_user_id: row.invited_by,
        related_moment_id: row.moment_id,
        invite_role: row.role,
      }))
      await admin.from('notifications').insert(notificationRows)
    }
  }

  return NextResponse.json({ hasPending })
}

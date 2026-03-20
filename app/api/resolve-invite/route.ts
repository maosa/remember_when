import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/resolve-invite
 *
 * Called by the client-side invite-confirm page after it has established a
 * session from the hash-fragment token. Resolves any pending moment_members
 * rows where `invited_email` matches the user's email, creating notifications.
 *
 * Body: { userId: string, email: string }
 * Response: { hasPending: boolean }
 */
export async function POST(request: NextRequest) {
  const { userId, email } = await request.json()

  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: pendingRows } = await admin
    .from('moment_members')
    .select('id, moment_id, role, invited_by')
    .eq('invited_email', email.toLowerCase())
    .is('user_id', null)

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ hasPending: false })
  }

  // Resolve rows: link to the now-existing user
  await admin
    .from('moment_members')
    .update({ user_id: userId, invited_email: null })
    .eq('invited_email', email.toLowerCase())
    .is('user_id', null)

  // Create moment_invite notifications
  const notificationRows = pendingRows.map((row) => ({
    user_id: userId,
    type: 'moment_invite' as const,
    related_user_id: row.invited_by,
    related_moment_id: row.moment_id,
    invite_role: row.role,
  }))
  await admin.from('notifications').insert(notificationRows)

  return NextResponse.json({ hasPending: true })
}

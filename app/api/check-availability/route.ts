import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/check-availability?username=xxx
 * GET /api/check-availability?email=xxx
 *
 * Server-side availability checks using the admin client (bypasses RLS).
 * Returns { available: boolean }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  const email = searchParams.get('email')

  const admin = createAdminClient()

  if (username) {
    const { data } = await admin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    return NextResponse.json({ available: !data })
  }

  if (email) {
    const { data } = await admin.auth.admin.getUserByEmail(email.toLowerCase())
    return NextResponse.json({ available: !data.user })
  }

  return NextResponse.json({ error: 'Provide username or email param' }, { status: 400 })
}

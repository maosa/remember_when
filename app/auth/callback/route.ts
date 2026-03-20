import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && sessionData.user) {
      const user = sessionData.user
      const admin = createAdminClient()

      // If the user has no public.users profile (ghost / invite-created user),
      // send them to complete-profile before anything else.
      const { data: profile } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        return NextResponse.redirect(`${origin}/auth/complete-profile`)
      }

      // Resolve any pending moment_members rows where invited_email matches
      // this user's email. This handles the unregistered-email invite flow:
      // the inviter created these rows before the user had an account.
      if (user.email) {
        const { data: pendingRows } = await admin
          .from('moment_members')
          .select('id, moment_id, role, invited_by')
          .eq('invited_email', user.email.toLowerCase())
          .is('user_id', null)

        if (pendingRows && pendingRows.length > 0) {
          // Resolve each row: link to the now-existing user
          await admin
            .from('moment_members')
            .update({ user_id: user.id, invited_email: null })
            .eq('invited_email', user.email.toLowerCase())
            .is('user_id', null)

          // Create moment_invite notifications for each resolved invite
          const notificationRows = pendingRows.map((row) => ({
            user_id: user.id,
            type: 'moment_invite' as const,
            related_user_id: row.invited_by,
            related_moment_id: row.moment_id,
            invite_role: row.role,
          }))
          await admin.from('notifications').insert(notificationRows)

          // Redirect to home with banner flag (append to existing next param if it's /home)
          const redirectPath = next === '/home' || next.startsWith('/home?')
            ? '/home?pending_invite=true'
            : next
          return NextResponse.redirect(`${origin}${redirectPath}`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

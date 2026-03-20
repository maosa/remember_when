'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Landing page for Supabase invite-by-email links.
 *
 * Supabase's `inviteUserByEmail` sends the user to `redirectTo` with auth tokens
 * in the URL *hash* fragment (implicit flow). Server routes cannot read hash
 * fragments, so we need this thin client page to pick up the session, then
 * decide where to send the user:
 *
 *   - Has a public.users profile → resolve invite rows + go to /home?pending_invite=true
 *   - No profile yet            → go to /auth/complete-profile to finish signup
 */
export default function InviteConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires immediately with the session recovered from the
    // hash fragment. SIGNED_IN covers both new and returning sessions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) return // wait for next event

        subscription.unsubscribe()

        const userId = session.user.id
        const email = session.user.email?.toLowerCase() ?? ''

        // Check whether a public.users profile exists for this user.
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle()

        if (!profile) {
          // Invited user — no profile yet. Send them to complete-profile.
          router.replace('/auth/complete-profile')
          return
        }

        // Profile exists: resolve any pending invited_email rows for this user
        // via the API route (server-side admin access).
        const res = await fetch('/api/resolve-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email }),
        })

        if (res.ok) {
          const { hasPending } = await res.json()
          router.replace(hasPending ? '/home?pending_invite=true' : '/home')
        } else {
          router.replace('/home')
        }
      }
    )

    // Safety: if no auth state fires within 10 s, something went wrong.
    const timeout = setTimeout(() => {
      setStatus('error')
      setErrorMsg('Could not verify your session. Please try signing in.')
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-destructive">{errorMsg}</p>
          <a href="/login" className="text-sm underline text-muted-foreground hover:text-foreground">
            Go to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Confirming your invite…</p>
      </div>
    </div>
  )
}

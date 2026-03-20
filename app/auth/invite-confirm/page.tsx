'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'error_expired' | 'error_generic'

/**
 * Landing page for Supabase invite-by-email and OTP magic-link flows.
 *
 * Supabase sends auth tokens in the URL *hash* fragment (implicit flow).
 * Server routes cannot read fragments, so this client page picks up the
 * session via onAuthStateChange and routes accordingly:
 *
 *   - Hash contains #error=... → show an appropriate error immediately
 *   - Has a public.users profile → resolve invite rows + /home?pending_invite=true
 *   - No profile yet (ghost user) → /auth/complete-profile
 */
export default function InviteConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    // Parse the hash fragment immediately — Supabase puts errors there too.
    const hash = window.location.hash.slice(1) // strip leading '#'
    const params = new URLSearchParams(hash)
    const errorCode = params.get('error_code')
    const error = params.get('error')

    if (error || errorCode) {
      if (errorCode === 'otp_expired' || error === 'access_denied') {
        setStatus('error_expired')
      } else {
        setStatus('error_generic')
      }
      return // don't set up the auth listener
    }

    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) return // wait for the next event

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
          // Ghost / invite-created user — no profile yet.
          router.replace('/auth/complete-profile')
          return
        }

        // Profile exists: resolve any pending invited_email rows.
        const res = await fetch('/api/resolve-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, email }),
        })

        const hasPending = res.ok ? (await res.json()).hasPending : false
        router.replace(hasPending ? '/home?pending_invite=true' : '/home')
      }
    )

    // Safety timeout — if no auth event fires within 10 s, something went wrong.
    const timeout = setTimeout(() => setStatus('error_generic'), 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  if (status === 'error_expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="font-semibold text-lg">Invite link expired</h2>
          <p className="text-sm text-muted-foreground">
            This link has already been used or has expired. Your invitation is
            still saved — just sign in with your email address and it will be
            applied automatically.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm underline text-foreground hover:opacity-80"
          >
            Go to sign in →
          </a>
        </div>
      </div>
    )
  }

  if (status === 'error_generic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="font-semibold text-lg">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            Could not verify your session. Please try signing in.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm underline text-foreground hover:opacity-80"
          >
            Go to sign in →
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

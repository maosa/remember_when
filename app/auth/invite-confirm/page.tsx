'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'error_expired' | 'error_generic'

/**
 * Landing page for Supabase invite-by-email links (implicit / hash flow).
 *
 * `createBrowserClient` from @supabase/ssr uses PKCE by default and does NOT
 * auto-process hash-fragment tokens. We therefore:
 *   1. Parse the hash ourselves to detect errors early.
 *   2. Extract access_token + refresh_token and call setSession() directly.
 *   3. Route based on whether the user already has a public.users profile.
 */
export default function InviteConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    async function handleInvite() {
      // Parse the hash fragment (strip leading '#')
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)

      const error     = params.get('error')
      const errorCode = params.get('error_code')

      // Surface hash errors immediately — no need to wait
      if (error || errorCode) {
        setStatus(
          errorCode === 'otp_expired' || error === 'access_denied'
            ? 'error_expired'
            : 'error_generic'
        )
        return
      }

      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (!accessToken || !refreshToken) {
        setStatus('error_generic')
        return
      }

      const supabase = createClient()

      // Manually establish the session from the hash tokens
      const { data: { session }, error: sessionError } =
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

      if (sessionError || !session) {
        console.error('setSession error:', sessionError)
        setStatus('error_expired')
        return
      }

      const userId = session.user.id
      const email  = session.user.email?.toLowerCase() ?? ''

      // Check whether a public.users profile exists for this user
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) {
        // Invited user — no profile yet. Collect name + username first.
        router.replace('/auth/complete-profile')
        return
      }

      // Profile exists: resolve any pending invited_email rows server-side
      const res = await fetch('/api/resolve-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      })

      const hasPending = res.ok ? (await res.json()).hasPending : false
      router.replace(hasPending ? '/home?pending_invite=true' : '/home')
    }

    handleInvite()
  }, [router])

  if (status === 'error_expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rw-bg px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="font-semibold text-lg">Invite link expired</h2>
          <p className="text-sm text-rw-text-muted">
            This link has already been used or has expired. Your invitation is
            still saved — just sign in with your email address and it will be
            applied automatically.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm underline text-rw-text-primary hover:opacity-80"
          >
            Go to sign in →
          </a>
        </div>
      </div>
    )
  }

  if (status === 'error_generic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rw-bg px-4">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="font-semibold text-lg">Something went wrong</h2>
          <p className="text-sm text-rw-text-muted">
            Could not verify your session. Please try signing in.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm underline text-rw-text-primary hover:opacity-80"
          >
            Go to sign in →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rw-bg">
      <div className="flex flex-col items-center gap-3 text-rw-text-muted">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Confirming your invite…</p>
      </div>
    </div>
  )
}

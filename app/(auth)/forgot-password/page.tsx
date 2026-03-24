'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={bgStyle}>
        <Card className="w-full max-w-[400px] shadow-rw-modal">
          <CardHeader className="border-b border-rw-border-subtle pb-5">
            <h2 className="font-serif text-[22px] font-semibold text-rw-text-primary">Check your email</h2>
            <p className="text-[14px] text-rw-text-muted mt-1">
              We sent a reset link to{' '}
              <strong className="text-rw-text-primary">{email}</strong>.
              Click it to choose a new password.
            </p>
          </CardHeader>
          <CardFooter className="pt-5">
            <Link href="/login" className="text-[13px] text-rw-text-muted hover:text-rw-text-primary transition-colors">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5" style={bgStyle}>
      <Card className="w-full max-w-[400px] shadow-rw-modal">
        <CardHeader className="border-b border-rw-border-subtle pb-5">
          {/* Decorative gradient bar */}
          <div
            className="mb-3 h-[3px] w-7 rounded-full"
            style={{ background: 'linear-gradient(to right, var(--rw-color-accent-subtle), var(--rw-color-accent))' }}
          />
          <h1 className="font-serif text-[22px] font-semibold text-rw-text-primary">Reset password</h1>
          <p className="text-[14px] text-rw-text-muted mt-0.5">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-5 space-y-4">
            {error && (
              <div className="rounded-[8px] border border-rw-danger/20 bg-rw-danger-subtle px-3.5 py-2.5 text-[13px] text-rw-danger">
                {error}
              </div>
            )}
            <div className="space-y-1.5 pb-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-1">
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
            <p className="text-[13px] text-rw-text-muted text-center">
              Remember your password?{' '}
              <Link href="/login" className="text-rw-text-primary hover:text-rw-accent transition-colors">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

const bgStyle: React.CSSProperties = {
  backgroundColor: 'var(--rw-color-bg)',
  backgroundImage: [
    'radial-gradient(ellipse 560px 380px at 105% 20%, rgba(212,224,218,0.40) 0%, transparent 70%)',
    'radial-gradient(ellipse 480px 320px at -10% 80%, rgba(216,232,216,0.32) 0%, transparent 65%)',
    'radial-gradient(ellipse 400px 280px at 50% 110%, rgba(224,232,237,0.28) 0%, transparent 65%)',
  ].join(', '),
}

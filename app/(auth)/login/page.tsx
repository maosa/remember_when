'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5" style={bgStyle}>
      <Card className="w-full max-w-[400px] shadow-rw-modal">
        {/* Card header — decorative accent bar + wordmark */}
        <CardHeader className="border-b border-rw-border-subtle pb-5">
          {/* Decorative sage–accent gradient bar */}
          <div
            className="mb-3 h-[3px] w-7 rounded-full"
            style={{ background: 'linear-gradient(to right, var(--rw-color-accent-subtle), var(--rw-color-accent))' }}
          />
          <h1 className="font-serif text-[22px] font-semibold text-rw-text-primary">Remember When</h1>
          <p className="text-[14px] text-rw-text-muted mt-0.5">Sign in to your account.</p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-5 space-y-4">
            {/* Error banner */}
            {error && (
              <div className="rounded-[8px] border border-rw-danger/20 bg-rw-danger-subtle px-3.5 py-2.5 text-[13px] text-rw-danger">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
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

            {/* Password — label row with forgot-password link */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-rw-text-muted hover:text-rw-accent transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-1">
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-[13px] text-rw-text-muted text-center">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-rw-text-primary hover:text-rw-accent transition-colors">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <Link href="/pricing" className="text-[12px] text-rw-text-placeholder hover:text-rw-text-muted transition-colors">
        See pricing plans
      </Link>
    </div>
  )
}

// Slightly repositioned gradients vs. sign-up for visual variety
const bgStyle: React.CSSProperties = {
  backgroundColor: 'var(--rw-color-bg)',
  backgroundImage: [
    'radial-gradient(ellipse 500px 340px at -5% 20%, rgba(216,232,216,0.35) 0%, transparent 65%)',
    'radial-gradient(ellipse 560px 380px at 105% 80%, rgba(212,224,218,0.4) 0%, transparent 70%)',
    'radial-gradient(ellipse 420px 300px at 50% 110%, rgba(224,232,237,0.28) 0%, transparent 65%)',
  ].join(', '),
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
type EmailStatus = 'idle' | 'checking' | 'available' | 'taken'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
  })
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Username availability check
  useEffect(() => {
    const username = formData.username.trim()

    if (!username) {
      setUsernameStatus('idle')
      return
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')

    if (usernameTimer.current) clearTimeout(usernameTimer.current)

    usernameTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/check-availability?username=${encodeURIComponent(username)}`)
      const json = await res.json()
      setUsernameStatus(json.available ? 'available' : 'taken')
    }, 500)

    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current)
    }
  }, [formData.username])

  // Email already-registered check
  useEffect(() => {
    const email = formData.email.trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('idle')
      return
    }

    setEmailStatus('checking')

    if (emailTimer.current) clearTimeout(emailTimer.current)

    emailTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/check-availability?email=${encodeURIComponent(email)}`)
      const json = await res.json()
      setEmailStatus(json.available ? 'available' : 'taken')
    }, 600)

    return () => {
      if (emailTimer.current) clearTimeout(emailTimer.current)
    }
  }, [formData.email])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (emailStatus === 'taken') {
      setError('An account with this email already exists.')
      return
    }
    if (emailStatus === 'checking') {
      setError('Please wait — checking email.')
      return
    }
    if (usernameStatus === 'taken') {
      setError('Username is already taken.')
      return
    }
    if (usernameStatus === 'invalid') {
      setError('Username must be 3–20 characters: letters, numbers, underscores only.')
      return
    }
    if (usernameStatus === 'checking') {
      setError('Please wait — checking username availability.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.username.toLowerCase(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center px-4" style={bgStyle}>
        <Card className="w-full max-w-[420px] shadow-rw-modal">
          <CardHeader className="border-b border-rw-border-subtle pb-5">
            <h2 className="font-serif text-[22px] font-semibold text-rw-text-primary">Check your email</h2>
            <p className="text-[14px] text-rw-text-muted mt-1">
              We sent a confirmation link to <strong className="text-rw-text-primary">{formData.email}</strong>.
              Click it to activate your account.
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
      <Card className="w-full max-w-[420px] shadow-rw-modal">
        {/* Card header — wordmark + subtitle */}
        <CardHeader className="border-b border-rw-border-subtle pb-5">
          <h1 className="font-serif text-[22px] font-semibold text-rw-text-primary">Remember When</h1>
          <p className="text-[14px] text-rw-text-muted mt-0.5">Start capturing your moments.</p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-5 space-y-4">
            {/* Error banner */}
            {error && (
              <div className="rounded-[8px] border border-rw-danger/20 bg-rw-danger-subtle px-3.5 py-2.5 text-[13px] text-rw-danger">
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Jane"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {emailStatus === 'checking' && (
                    <Loader2 className="size-4 animate-spin text-rw-text-placeholder" />
                  )}
                  {emailStatus === 'taken' && (
                    <XCircle className="size-4 text-rw-danger" />
                  )}
                </div>
              </div>
              {emailStatus === 'taken' && (
                <p className="text-[12px] text-rw-danger">
                  An account with this email already exists.{' '}
                  <Link href="/login" className="underline underline-offset-2 hover:text-rw-danger/80 transition-colors">
                    Sign in
                  </Link>
                  {' '}— or use{' '}
                  <Link href="/forgot-password" className="underline underline-offset-2 hover:text-rw-danger/80 transition-colors">
                    forgot password
                  </Link>
                  {' '}if you&apos;ve forgotten it.
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  placeholder="janesmith"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="size-4 animate-spin text-rw-text-placeholder" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="size-4 text-rw-accent" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <XCircle className="size-4 text-rw-danger" />
                  )}
                </div>
              </div>
              {usernameStatus === 'available' && (
                <p className="text-[12px] text-rw-accent">Available</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="text-[12px] text-rw-danger">Already taken</p>
              )}
              {usernameStatus === 'invalid' && (
                <p className="text-[12px] text-rw-text-muted">3–20 characters: letters, numbers, underscores</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5 pb-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || emailStatus === 'taken' || emailStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'checking'}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-[13px] text-rw-text-muted text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-rw-text-primary hover:text-rw-accent transition-colors">
                Sign in
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

// Warm linen background with subtle radial gradient accents — matches design system auth screens
const bgStyle: React.CSSProperties = {
  backgroundColor: 'var(--rw-color-bg)',
  backgroundImage: [
    'radial-gradient(ellipse 600px 400px at 50% -60px, rgba(212,224,218,0.45) 0%, transparent 70%)',
    'radial-gradient(ellipse 480px 320px at -10% 90%, rgba(216,232,216,0.3) 0%, transparent 65%)',
    'radial-gradient(ellipse 400px 280px at 110% 85%, rgba(224,232,237,0.3) 0%, transparent 65%)',
  ].join(', '),
}

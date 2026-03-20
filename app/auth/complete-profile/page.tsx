'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

/**
 * Profile completion page for users who signed up via an invite email.
 *
 * Supabase's inviteUserByEmail creates an auth.users entry but our DB trigger
 * intentionally skips creating a public.users row for invite-created users
 * (they have no username). This page collects first name, last name, username,
 * and (optionally) a new password, then posts to /api/complete-profile.
 */
export default function CompleteProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
  })
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Populate email from current session (invite already authenticated them)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  useEffect(() => {
    const username = formData.username.trim()

    if (!username) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setUsernameStatus('invalid'); return
    }

    setUsernameStatus('checking')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [formData.username])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (usernameStatus === 'taken') { setError('Username is already taken.'); return }
    if (usernameStatus === 'invalid') { setError('Username must be 3–20 characters: letters, numbers, underscores only.'); return }
    if (usernameStatus === 'checking') { setError('Please wait — checking username availability.'); return }

    setLoading(true)

    const res = await fetch('/api/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.toLowerCase().trim(),
        password: formData.password || undefined,
      }),
    })

    const json = await res.json()

    if (!res.ok || json.error) {
      setError(json.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.replace(json.hasPending ? '/home?pending_invite=true' : '/home')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            You were invited to Remember When. Finish setting up your account to get started.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {email && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-sm">{email}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
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
              <div className="space-y-2">
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

            <div className="space-y-2">
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
                  className="pr-8"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {usernameStatus === 'checking' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {usernameStatus === 'available' && <CheckCircle className="size-4 text-green-500" />}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="size-4 text-destructive" />}
                </div>
              </div>
              {usernameStatus === 'available' && <p className="text-xs text-green-600">Available</p>}
              {usernameStatus === 'taken' && <p className="text-xs text-destructive">Already taken</p>}
              {usernameStatus === 'invalid' && <p className="text-xs text-muted-foreground">3–20 characters: letters, numbers, underscores</p>}
            </div>

            <div className="space-y-2 pb-2">
              <Label htmlFor="password">
                Password <span className="text-muted-foreground text-xs font-normal">(set or update)</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
            >
              {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : 'Save and continue'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

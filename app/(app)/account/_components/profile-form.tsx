'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateProfile, updateEmail } from '../actions'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

interface Props {
  initialData: {
    firstName: string
    lastName: string
    email: string
    username: string
  }
}

export function ProfileForm({ initialData }: Props) {
  const [firstName, setFirstName] = useState(initialData.firstName)
  const [lastName, setLastName] = useState(initialData.lastName)
  const [email, setEmail] = useState(initialData.email)
  const [username, setUsername] = useState(initialData.username)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Email re-auth modal
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [emailModalError, setEmailModalError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Incremented every time a new async check is dispatched; lets us discard responses
  // from earlier in-flight requests that complete after a newer one already returned.
  const checkIdRef = useRef(0)

  useEffect(() => {
    const trimmed = username.trim().toLowerCase()

    if (trimmed === initialData.username) {
      setUsernameStatus('idle')
      return
    }

    if (!trimmed) {
      setUsernameStatus('idle')
      return
    }

    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      const id = ++checkIdRef.current
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle()

      // Discard if a newer check has already been dispatched while this one was in flight
      if (checkIdRef.current !== id) return
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [username, initialData.username])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)

    if (usernameStatus === 'taken') {
      setMessage({ type: 'error', text: 'Username is already taken.' })
      return
    }
    if (usernameStatus === 'invalid') {
      setMessage({ type: 'error', text: 'Username must be 3–20 characters: letters, numbers, underscores only.' })
      return
    }
    if (usernameStatus === 'checking') {
      setMessage({ type: 'error', text: 'Please wait — checking username availability.' })
      return
    }

    const emailChanged = email.trim().toLowerCase() !== initialData.email

    if (emailChanged) {
      setEmailModalOpen(true)
      return
    }

    const formData = new FormData()
    formData.append('firstName', firstName)
    formData.append('lastName', lastName)
    formData.append('username', username)

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Profile updated.' })
      }
    })
  }

  async function handleEmailConfirm() {
    setEmailModalError(null)
    setIsVerifying(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: initialData.email,
      password: currentPassword,
    })

    if (authError) {
      setEmailModalError('Incorrect password.')
      setIsVerifying(false)
      return
    }

    setIsVerifying(false)

    const formData = new FormData()
    formData.append('firstName', firstName)
    formData.append('lastName', lastName)
    formData.append('username', username)

    startTransition(async () => {
      await updateProfile(formData)
      const result = await updateEmail(email.trim().toLowerCase())
      setEmailModalOpen(false)
      setCurrentPassword('')
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Profile updated. Check your new email address for a confirmation link.' })
      }
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-rw-danger' : 'text-rw-accent'}`}>
            {message.text}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <p className="text-xs text-rw-text-muted">
            Changing your email will send a confirmation link to the new address.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="pr-8"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {usernameStatus === 'checking' && (
                <Loader2 className="size-4 animate-spin text-rw-text-muted" />
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
            <p className="text-xs text-rw-accent">Available</p>
          )}
          {usernameStatus === 'taken' && (
            <p className="text-xs text-rw-danger">Already taken</p>
          )}
          {usernameStatus === 'invalid' && (
            <p className="text-xs text-rw-text-muted">3–20 characters: letters, numbers, underscores</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isPending || usernameStatus === 'taken' || usernameStatus === 'checking'}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <Dialog open={emailModalOpen} onOpenChange={(open) => {
        setEmailModalOpen(open)
        if (!open) {
          setCurrentPassword('')
          setEmailModalError(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your password</DialogTitle>
            <DialogDescription>
              Enter your current password to confirm the email change to <strong>{email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="current-password-email">Current password</Label>
            <Input
              id="current-password-email"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value)
                setEmailModalError(null)
              }}
              autoComplete="current-password"
              autoFocus
            />
            {emailModalError && <p className="text-xs text-rw-danger">{emailModalError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailModalOpen(false)}
              disabled={isVerifying || isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEmailConfirm}
              disabled={isVerifying || isPending || !currentPassword}
            >
              {isVerifying || isPending ? 'Verifying…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

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
        <CardHeader className="border-b border-rw-border-subtle pb-5">
          {/* Decorative gradient bar */}
          <div
            className="mb-3 h-[3px] w-7 rounded-full"
            style={{ background: 'linear-gradient(to right, var(--rw-color-accent-subtle), var(--rw-color-accent))' }}
          />
          <h1 className="font-serif text-[22px] font-semibold text-rw-text-primary">Set new password</h1>
          <p className="text-[14px] text-rw-text-muted mt-0.5">Choose a new password for your account.</p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="pt-5 space-y-4">
            {error && (
              <div className="rounded-[8px] border border-rw-danger/20 bg-rw-danger-subtle px-3.5 py-2.5 text-[13px] text-rw-danger">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-1.5 pb-3">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </CardContent>

          <CardFooter className="pt-1">
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

const bgStyle: React.CSSProperties = {
  backgroundColor: 'var(--rw-color-bg)',
  backgroundImage: [
    'radial-gradient(ellipse 500px 340px at -5% 20%, rgba(216,232,216,0.35) 0%, transparent 65%)',
    'radial-gradient(ellipse 560px 380px at 110% 75%, rgba(212,224,218,0.38) 0%, transparent 70%)',
    'radial-gradient(ellipse 420px 300px at 50% 110%, rgba(224,232,237,0.28) 0%, transparent 65%)',
  ].join(', '),
}

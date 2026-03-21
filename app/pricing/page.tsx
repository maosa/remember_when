'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/app-nav'

const FREE_FEATURES = [
  'Create unlimited moments',
  'Invite family & friends',
  'Photos, videos & audio',
  'Generous storage included',
  'All core features',
  'Early users grandfathered in',
]

const PLUS_FEATURES = [
  'Everything in Free',
  'Extended storage',
  'Higher upload limits',
  'Priority support',
]

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: { firstName: string; lastName: string; photoUrl: string | null }; unreadCount: number }

export default function PricingPage() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setAuth({ status: 'unauthenticated' })
        return
      }

      const [profileRes, unreadRes] = await Promise.all([
        supabase
          .from('users')
          .select('first_name, last_name, profile_photo_url')
          .eq('id', user.id)
          .single(),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
      ])

      setAuth({
        status: 'authenticated',
        user: {
          firstName: profileRes.data?.first_name ?? '',
          lastName: profileRes.data?.last_name ?? '',
          photoUrl: profileRes.data?.profile_photo_url ?? null,
        },
        unreadCount: unreadRes.count ?? 0,
      })
    }

    checkAuth()
  }, [])

  const isAuthenticated = auth.status === 'authenticated'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — authenticated: full app nav; guest: sign-in/get-started; loading: placeholder */}
      {auth.status === 'loading' && (
        <header className="border-b bg-background/95 h-14 shrink-0" />
      )}
      {auth.status === 'unauthenticated' && (
        <header className="border-b bg-background/95 backdrop-blur-sm shrink-0">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Remember When
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
                Get started
              </Link>
            </div>
          </div>
        </header>
      )}
      {auth.status === 'authenticated' && (
        <AppNav user={auth.user} unreadCount={auth.unreadCount} />
      )}

      {/* Main — offset for fixed AppNav when authenticated */}
      <main className={cn('flex-1', isAuthenticated && 'md:pt-14 pb-20 md:pb-0')}>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Simple, honest pricing</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start for free and keep your memories forever. Storage-based plans coming as Remember When grows.
          </p>
        </section>

        {/* Tiers */}
        <section className="max-w-3xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-4">

            {/* Free tier */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Free</CardTitle>
                <CardDescription>For everyone, forever</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <span className="text-4xl font-semibold tracking-tight">$0</span>
                  <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="size-4 mt-px shrink-0 text-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isAuthenticated ? (
                  <p className="text-sm text-muted-foreground">
                    ✓ Your current plan
                  </p>
                ) : (
                  <Link href="/signup" className={cn(buttonVariants(), 'w-full justify-center')}>
                    Get started free
                  </Link>
                )}
              </CardFooter>
            </Card>

            {/* Plus tier — placeholder */}
            <Card className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Plus</CardTitle>
                  <Badge variant="muted">Coming soon</Badge>
                </div>
                <CardDescription>For families who love sharing</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <span className="text-4xl font-semibold tracking-tight text-muted-foreground">TBD</span>
                  <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="size-4 mt-px shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" disabled>
                  Coming soon
                </Button>
              </CardFooter>
            </Card>

          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Free tier storage caps will be introduced gradually.{' '}
            Early users are grandfathered in at launch-era limits.
          </p>
        </section>
      </main>
    </div>
  )
}

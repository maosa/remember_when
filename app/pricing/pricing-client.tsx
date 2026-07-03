'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SitePageChrome, useSitePageAuth } from '@/components/site-page-chrome'
import { formatPrice, type CurrencyCode } from '@/lib/pricing/currency'

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

export function PricingClient({ currency }: { currency: CurrencyCode }) {
  return (
    <SitePageChrome>
      <PricingContent currency={currency} />
    </SitePageChrome>
  )
}

// Rendered inside SitePageChrome so it can read auth state from context.
function PricingContent({ currency }: { currency: CurrencyCode }) {
  const auth = useSitePageAuth()
  const isAuthenticated = auth.status === 'authenticated'

  return (
    <>
        {/* Hero */}
        <section className="max-w-[1100px] mx-auto px-6 pt-16 pb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Simple, honest pricing</h1>
          <p className="text-rw-text-muted max-w-md mx-auto">
            Start for free and keep your memories forever. Storage-based plans coming as Remember When grows.
          </p>
        </section>

        {/* Tiers */}
        <section className="max-w-[720px] mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-4">

            {/* Free tier */}
            <Card className="flex flex-col">
              <CardHeader>
                <p className="font-sans text-xs font-semibold uppercase tracking-widest text-rw-text-muted">Free</p>
                <CardTitle className="text-lg">For everyone, forever</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <span className="text-4xl font-semibold tracking-tight">{formatPrice(0, currency)}</span>
                  <span className="text-rw-text-muted text-sm ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-px shrink-0 flex size-4 items-center justify-center rounded-full bg-rw-accent-subtle">
                        <Check className="size-2.5 text-rw-accent" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {auth.status === 'loading' ? (
                  // Reserve footer height until auth resolves so the CTA never
                  // flashes before swapping to the current-plan indicator.
                  <div className="h-9 w-full" aria-hidden />
                ) : isAuthenticated ? (
                  <p className="h-9 flex items-center gap-2 text-sm font-semibold text-rw-text-primary">
                    <span className="shrink-0 flex size-5 items-center justify-center rounded-full bg-rw-accent-subtle">
                      <Check className="size-3 text-rw-accent" />
                    </span>
                    Your current plan
                  </p>
                ) : (
                  <Link href="/signup" className={cn(buttonVariants(), 'w-full justify-center')}>
                    Get started for free
                  </Link>
                )}
              </CardFooter>
            </Card>

            {/* Plus tier — placeholder */}
            <Card className="flex flex-col border-[rgba(200,152,64,0.28)] bg-gradient-to-b from-[rgba(200,152,64,0.04)] to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <p className="font-sans text-xs font-semibold uppercase tracking-widest text-rw-text-muted">Plus</p>
                  <Badge variant="muted">Coming soon</Badge>
                </div>
                <CardTitle className="text-lg">For families who love sharing</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <span className="text-4xl font-semibold tracking-tight text-rw-text-muted">TBD</span>
                  <span className="text-rw-text-muted text-sm ml-1">/ month</span>
                </div>
                <ul className="space-y-2.5">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-rw-text-muted opacity-60">
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

          <p className="text-center text-xs text-rw-text-muted mt-8">
            Free tier storage caps will be introduced gradually.{' '}
            Early users are grandfathered in at launch-era limits.
          </p>
        </section>
    </>
  )
}

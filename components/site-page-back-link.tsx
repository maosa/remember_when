'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useSitePageAuth } from '@/components/site-page-chrome'

/**
 * Contextual "back" link for the public legal pages (/terms, /privacy).
 *
 * Depends on the auth state resolved by SitePageChrome (via useSitePageAuth) and
 * the `from` query param, so it must be rendered inside a <SitePageChrome> and
 * wrapped in a <Suspense> boundary (useSearchParams would otherwise opt the
 * statically-prerendered page into client rendering).
 *
 *   from=account & signed in → Back to account (/account)
 *   signed in                → Back to home (/home)
 *   signed out               → Back to home (/) — the landing page
 *   while auth is resolving   → hidden (avoids flashing a wrong target)
 */
export function SitePageBackLink() {
  const auth = useSitePageAuth()
  const from = useSearchParams().get('from')

  if (auth.status === 'loading') return null

  const authenticated = auth.status === 'authenticated'
  const { href, label } =
    from === 'account' && authenticated
      ? { href: '/account', label: 'Back to account' }
      : authenticated
        ? { href: '/home', label: 'Back to home' }
        : { href: '/', label: 'Back to home' }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-rw-text-muted hover:text-rw-text-primary transition-colors"
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  )
}

import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The "Remember When" header wordmark — single source of truth so the logo is
 * pixel-identical (position, size, weight, tracking, colour) across every page's
 * top bar and never shifts on navigation.
 *
 * Every header bar that uses it MUST share the same height (h-14) and horizontal
 * inset (px-6 sm:px-10); otherwise the logo's viewport position changes between
 * pages and it appears to jump. Links to the landing page (`/`) by default.
 */
export function Wordmark({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'font-serif text-[18px] font-semibold text-rw-text-primary tracking-tight hover:text-rw-accent transition-colors',
        className,
      )}
    >
      Remember When
    </Link>
  )
}

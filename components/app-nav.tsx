'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Bell, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface AppNavUser {
  firstName: string
  lastName: string
  photoUrl: string | null
}

interface Props {
  user: AppNavUser
  unreadCount: number
}

const NAV_ITEMS = [
  { href: '/home',          icon: Home,  label: 'Home' },
  { href: '/friends',       icon: Users, label: 'Friends' },
  { href: '/notifications', icon: Bell,  label: 'Alerts' },
  { href: '/account',       icon: User,  label: 'Account' },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home' || pathname.startsWith('/moments/')
  if (href === '/account') return pathname === '/account' || pathname.startsWith('/account/')
  return pathname === href || pathname.startsWith(href + '/')
}

/**
 * Centre nav links (Home / Friends). Shared by the solid in-app top bar and the
 * transparent landing-page nav, so the two can't drift.
 */
export function AppNavLinks({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {NAV_ITEMS.slice(0, 2).map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            isActive(pathname, href)
              ? 'text-rw-accent'
              : 'text-rw-text-muted hover:text-rw-text-primary hover:bg-rw-surface'
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

/**
 * Right-side actions (notifications bell + badge, account avatar). Shared by the
 * in-app top bar and the landing-page nav.
 */
export function AppNavActions({ user, unreadCount, className }: Props & { className?: string }) {
  const pathname = usePathname()
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Link
        href="/notifications"
        className={cn(
          'relative flex items-center justify-center size-[34px] rounded-full transition-colors',
          isActive(pathname, '/notifications')
            ? 'text-rw-text-primary bg-rw-surface'
            : 'text-rw-text-muted hover:text-rw-text-primary hover:bg-rw-surface'
        )}
        aria-label="Notifications"
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 size-2 rounded-full bg-rw-blue border-2 border-rw-bg"
            aria-label={`${unreadCount} unread`}
          />
        )}
      </Link>

      <Link href="/account" aria-label="Account">
        <Avatar className="size-8 transition-opacity hover:opacity-80">
          <AvatarImage src={user.photoUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} />
          <AvatarFallback className="text-xs bg-rw-accent-subtle text-rw-accent font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
    </div>
  )
}

/**
 * Mobile bottom tab bar. Rendered by the in-app layout and by the landing page
 * for authenticated visitors, so signed-in users get full app navigation there.
 */
export function AppTabBar({ user, unreadCount }: Props) {
  const pathname = usePathname()
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm flex items-center justify-around px-1">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(pathname, href)
        const isAccount = href === '/account'
        const isBell = href === '/notifications'

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-[3px] flex-1 py-2 px-1 rounded-lg transition-colors',
              active ? 'text-rw-accent' : 'text-rw-text-muted'
            )}
          >
            {isAccount ? (
              <Avatar
                className={cn(
                  'size-6 transition-all',
                  active && 'ring-2 ring-rw-accent ring-offset-1 ring-offset-rw-bg'
                )}
              >
                <AvatarImage src={user.photoUrl ?? undefined} />
                <AvatarFallback className="text-[9px] bg-rw-accent-subtle text-rw-accent">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : isBell ? (
              <span className="relative">
                <Icon className="size-5" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-[7px] rounded-full bg-rw-blue border-2 border-rw-bg" />
                )}
              </span>
            ) : (
              <Icon className="size-5" strokeWidth={1.8} />
            )}
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AppNav({ user, unreadCount }: Props) {
  return (
    <>
      {/* ── Desktop: top bar ───────────────────────────────────── */}
      {/* 3 equal columns so the centre links sit at the true page centre,
          independent of the (differing) widths of the logo and right actions. */}
      <nav className="hidden md:grid grid-cols-3 fixed top-0 inset-x-0 z-50 h-14 border-b border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm items-center px-6 sm:px-10">

        {/* Logo — Lora serif. Links to the landing page so signed-in users can
            always return there (the landing page offers the app nav back in). */}
        <Link
          href="/"
          className="font-serif text-[18px] font-semibold text-rw-text-primary justify-self-start hover:text-rw-accent transition-colors"
        >
          Remember When
        </Link>

        {/* Centre nav links */}
        <AppNavLinks className="justify-self-center" />

        {/* Right actions — bell + avatar */}
        <AppNavActions user={user} unreadCount={unreadCount} className="justify-self-end" />
      </nav>

      {/* ── Mobile: bottom tab bar ─────────────────────────────── */}
      <AppTabBar user={user} unreadCount={unreadCount} />
    </>
  )
}

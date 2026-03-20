'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Bell, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Props {
  user: {
    firstName: string
    lastName: string
    photoUrl: string | null
  }
  unreadCount: number
}

const NAV_ITEMS = [
  { href: '/home',          icon: Home,  label: 'Home' },
  { href: '/friends',       icon: Users, label: 'Friends' },
  { href: '/notifications', icon: Bell,  label: 'Alerts' },
  { href: '/account',       icon: User,  label: 'Account' },
] as const

export function AppNav({ user, unreadCount }: Props) {
  const pathname = usePathname()
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()

  function isActive(href: string) {
    if (href === '/home') return pathname === '/home' || pathname.startsWith('/moments/')
    if (href === '/account') return pathname === '/account' || pathname.startsWith('/account/')
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* ── Desktop: top bar ───────────────────────────────────── */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 h-14 border-b bg-background/95 backdrop-blur-sm items-center px-6 gap-6">
        <Link
          href="/home"
          className="text-sm font-semibold tracking-tight mr-2 shrink-0"
        >
          Remember When
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.slice(0, 2).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                isActive(href)
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/notifications"
            className={cn(
              'relative flex items-center justify-center size-9 rounded-md transition-colors',
              isActive('/notifications')
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            aria-label="Notifications"
          >
            <Bell className="size-4.5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary"
                aria-label={`${unreadCount} unread`}
              />
            )}
          </Link>

          <Link href="/account" aria-label="Account">
            <Avatar className="size-8 transition-opacity hover:opacity-80">
              <AvatarImage src={user.photoUrl ?? undefined} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </nav>

      {/* ── Mobile: bottom tab bar ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 border-t bg-background/95 backdrop-blur-sm flex items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          const isAccount = href === '/account'
          const isBell = href === '/notifications'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {isAccount ? (
                <Avatar className={cn('size-6 transition-all', active && 'ring-2 ring-foreground ring-offset-1')}>
                  <AvatarImage src={user.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
              ) : isBell ? (
                <span className="relative">
                  <Icon className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
                  )}
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

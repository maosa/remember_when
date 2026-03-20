'use client'

import Link from 'next/link'
import { Bell, UserPlus, Users, MessageSquare, LogOut, Crown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationRow } from '../page'

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    label: (n: NotificationRow) => string
    href: (n: NotificationRow) => string
  }
> = {
  friend_request: {
    icon: UserPlus,
    label: (n) => `${senderName(n)} sent you a friend request`,
    href: () => '/friends',
  },
  friend_request_accepted: {
    icon: Users,
    label: (n) => `${senderName(n)} accepted your friend request`,
    href: () => '/friends',
  },
  moment_invite: {
    icon: Bell,
    label: (n) => `${senderName(n)} invited you to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  moment_invite_accepted: {
    icon: Users,
    label: (n) => `${senderName(n)} accepted your invite to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  moment_invite_declined: {
    icon: Users,
    label: (n) => `${senderName(n)} declined your invite to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  new_post: {
    icon: MessageSquare,
    label: (n) => `${senderName(n)} added a post to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  member_left: {
    icon: LogOut,
    label: (n) => `${senderName(n)} left "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  ownership_transferred: {
    icon: Crown,
    label: (n) => `${senderName(n)} transferred ownership of "${momentName(n)}" to you`,
    href: (n) => momentHref(n),
  },
  reminder: {
    icon: Clock,
    label: () => 'Time to capture a new moment!',
    href: () => '/home',
  },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function senderName(n: NotificationRow) {
  if (!n.fromUser) return 'Someone'
  return `${n.fromUser.firstName} ${n.fromUser.lastName}`
}

function momentName(n: NotificationRow) {
  return n.moment?.name ?? 'a moment'
}

function momentHref(n: NotificationRow) {
  return n.moment ? `/moments/${n.moment.id}` : '/home'
}

interface Props {
  notifications: NotificationRow[]
}

export function NotificationList({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <Bell className="size-10 opacity-30" />
        <p className="text-sm">You&apos;re all caught up.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {notifications.map((n) => {
        const config = TYPE_CONFIG[n.type]
        if (!config) return null
        const Icon = config.icon
        const unread = !n.read

        return (
          <li key={n.id}>
            <Link
              href={config.href(n)}
              className={cn(
                'flex items-start gap-3 py-4 px-1 rounded-lg transition-colors hover:bg-muted/50',
                unread && 'bg-muted/30'
              )}
            >
              <span className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                unread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <Icon className="size-4" />
              </span>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', unread ? 'font-medium' : 'text-muted-foreground')}>
                  {config.label(n)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeAgo(n.createdAt)}
                </p>
              </div>

              {unread && (
                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

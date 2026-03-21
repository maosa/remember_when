'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Bell, UserPlus, Users, MessageSquare, LogOut, Crown, Clock, Check, X, Shield, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { acceptMomentInvite, declineMomentInvite } from '@/app/(app)/moments/[id]/actions'
import type { NotificationRow } from '../page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function senderTag(n: NotificationRow) {
  if (!n.fromUser) return 'Someone'
  const username = n.fromUser.username ? `@${n.fromUser.username}` : null
  const fullName = `${n.fromUser.firstName} ${n.fromUser.lastName}`
  return username ? `${username} (${fullName})` : fullName
}

function momentName(n: NotificationRow) {
  return n.moment?.name ?? 'a moment'
}

function momentHref(n: NotificationRow) {
  return n.moment ? `/moments/${n.moment.id}` : '/home'
}

// ─── Notification label helpers ───────────────────────────────────────────────

function inviteLabel(n: NotificationRow): string {
  const role = n.inviteRole ? ` as ${n.inviteRole === 'editor' ? 'Editor' : 'Reader'}` : ''
  return `${senderTag(n)} invited you${role} on moment "${momentName(n)}"`
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    label: (n: NotificationRow) => string
    href: (n: NotificationRow) => string
    actionable?: boolean
  }
> = {
  friend_request_received: {
    icon: UserPlus,
    label: (n) => `${senderTag(n)} sent you a friend request`,
    href: () => '/friends',
  },
  friend_request_accepted: {
    icon: Users,
    label: (n) => `${senderTag(n)} accepted your friend request`,
    href: () => '/friends',
  },
  moment_invite: {
    icon: Bell,
    label: inviteLabel,
    href: (n) => momentHref(n),
    actionable: true,
  },
  moment_invite_accepted: {
    icon: Users,
    label: (n) => `${senderTag(n)} accepted your invite to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  moment_invite_declined: {
    icon: Users,
    label: (n) => `${senderTag(n)} declined your invite to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  new_post: {
    icon: MessageSquare,
    label: (n) => `${senderTag(n)} added a post to "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  member_left: {
    icon: LogOut,
    label: (n) => `${senderTag(n)} left "${momentName(n)}"`,
    href: (n) => momentHref(n),
  },
  ownership_transferred: {
    icon: Crown,
    label: (n) => `${senderTag(n)} transferred ownership of "${momentName(n)}" to you`,
    href: (n) => momentHref(n),
  },
  ownership_transferred_away: {
    icon: Crown,
    label: (n) => `You transferred ownership of "${momentName(n)}" to ${senderTag(n)}`,
    href: (n) => momentHref(n),
  },
  role_changed: {
    icon: Shield,
    label: (n) => {
      const role = n.inviteRole === 'editor' ? 'Editor' : n.inviteRole === 'reader' ? 'Reader' : 'a new role'
      return `Your role on "${momentName(n)}" has been changed to ${role} by ${senderTag(n)}`
    },
    href: (n) => momentHref(n),
  },
  moment_deleted: {
    icon: Trash2,
    label: (n) => {
      const name = (n.metadata as { moment_name?: string } | null)?.moment_name ?? 'a moment'
      return `The moment "${name}" has been deleted by ${senderTag(n)}`
    },
    href: () => '/home',
  },
  reminder: {
    icon: Clock,
    label: () => 'Time to capture a new moment!',
    href: () => '/home',
  },
}

// ─── Accept/Decline buttons for moment_invite ─────────────────────────────────

function InviteActions({
  momentId,
  initialStatus,
}: {
  momentId: string
  initialStatus: 'pending' | 'accepted' | 'declined' | null
}) {
  const [isPending, startTransition] = useTransition()
  // Local state overrides the server-fetched status once the user acts here
  const [outcome, setOutcome] = useState<'accepted' | 'declined' | null>(null)

  const resolved = outcome ?? (initialStatus !== 'pending' ? initialStatus : null)

  if (resolved === 'accepted') {
    return (
      <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1.5">
        <Check className="size-3" /> You accepted this invitation
      </span>
    )
  }
  if (resolved === 'declined') {
    return (
      <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1.5">
        <X className="size-3" /> You declined this invitation
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptMomentInvite(momentId)
            if (!result?.error) setOutcome('accepted')
          })
        }
        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Check className="size-3" />
        Accept
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await declineMomentInvite(momentId)
            if (!result?.error) setOutcome('declined')
          })
        }
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <X className="size-3" />
        Decline
      </button>
    </div>
  )
}

// ─── List ─────────────────────────────────────────────────────────────────────

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
        const isActionable = config.actionable && !!n.moment

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
                {isActionable && (
                  <InviteActions momentId={n.moment!.id} initialStatus={n.memberStatus} />
                )}
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

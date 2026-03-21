'use client'

import { useTransition } from 'react'
import { markAllNotificationsAsRead } from '../actions'

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsAsRead())}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {isPending ? 'Marking…' : 'Mark all as read'}
    </button>
  )
}

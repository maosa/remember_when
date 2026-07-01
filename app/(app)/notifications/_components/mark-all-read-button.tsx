'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { markAllNotificationsAsRead } from '../actions'

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsAsRead()
          if (result?.error) toast.error("Couldn't mark notifications as read. Please try again.")
        })
      }
      className="text-xs text-rw-text-muted hover:text-rw-text-primary transition-colors disabled:opacity-50"
    >
      {isPending ? 'Marking…' : 'Mark all as read'}
    </button>
  )
}

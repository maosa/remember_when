'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteAccount } from '../actions'

interface Props {
  username: string
  sharedMoments: { id: string; name: string }[]
}

export function DeleteAccountDialog({ username, sharedMoments }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isBlocked = sharedMoments.length > 0

  function handleDelete() {
    if (confirmation !== username) {
      setError('Username does not match.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await deleteAccount()
      // On success deleteAccount() redirects and never returns. A returned
      // error means the guard tripped (e.g. state changed after page load).
      if (res?.error) setError(res.error)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setConfirmation('')
        setError(null)
      }
    }}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </DialogTrigger>
      <DialogContent>
        {isBlocked ? (
          <>
            <DialogHeader>
              <DialogTitle>Transfer ownership first</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-rw-text-muted">
                Your account can&rsquo;t be deleted yet. You own moments that are shared with other
                people, and deleting your account would permanently remove them for everyone.
              </p>
              <p className="text-sm text-rw-text-muted">
                To continue, open each moment below and transfer ownership to another member (or
                delete the moment). Once none of your moments are shared with others, you&rsquo;ll be
                able to delete your account.
              </p>
              <div className="space-y-1.5">
                <Label>Moments needing an ownership transfer</Label>
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-rw-card border border-rw-border-subtle bg-rw-surface p-3">
                  {sharedMoments.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/moments/${m.id}`}
                        className="block truncate rounded px-2 py-1.5 text-sm text-rw-accent hover:bg-rw-surface-raised/70 hover:underline"
                      >
                        {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Delete your account</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-sm text-rw-text-muted">
                This permanently deletes your account, any moments you own, and all posts you&rsquo;ve
                made across the app. This cannot be undone.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-username">
                  Type <strong>{username}</strong> to confirm
                </Label>
                <Input
                  id="confirm-username"
                  value={confirmation}
                  onChange={(e) => {
                    setConfirmation(e.target.value)
                    setError(null)
                  }}
                  placeholder={username}
                  autoComplete="off"
                />
                {error && <p className="text-xs text-rw-danger">{error}</p>}
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending || confirmation !== username}
              >
                {isPending ? 'Deleting…' : 'Delete my account'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

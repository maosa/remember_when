'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteAccount } from '../actions'

interface Props {
  username: string
}

export function DeleteAccountDialog({ username }: Props) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (confirmation !== username) {
      setError('Username does not match.')
      return
    }
    setError(null)
    startTransition(async () => {
      await deleteAccount()
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
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This permanently removes your personal data. Your contributions to shared moments will remain and will continue to be attributed to you. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
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
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || confirmation !== username}
          >
            {isPending ? 'Deleting…' : 'Delete my account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

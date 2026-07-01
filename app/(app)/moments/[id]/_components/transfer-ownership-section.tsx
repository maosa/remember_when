'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { transferOwnership, type MomentMemberFull } from '../actions'

export function TransferOwnershipSection({
  momentId,
  editors,
}: {
  momentId: string
  editors: MomentMemberFull[]
}) {
  const [newOwnerId, setNewOwnerId] = useState(editors[0]?.userId ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selectedEditor = editors.find((e) => e.userId === newOwnerId)

  function handleTransfer() {
    if (!newOwnerId) return
    setError(null)
    setConfirmOpen(false)
    startTransition(async () => {
      const res = await transferOwnership(momentId, newOwnerId)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-rw-text-muted">
        Transfer ownership to an editor. You will become an editor. This action can only be
        reversed by the new owner.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="transfer-owner-select">New owner</Label>
          <div className="relative">
            <select
              id="transfer-owner-select"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              className="h-8 w-full appearance-none rounded-md border bg-rw-bg pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rw-accent/30"
            >
              {editors.map((e) => (
                <option key={e.userId} value={e.userId!}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted" />
          </div>
        </div>
        <Button
          variant="outline"
          className="h-8"
          onClick={() => setConfirmOpen(true)}
          disabled={!newOwnerId || isPending}
        >
          {isPending ? 'Transferring…' : 'Transfer'}
        </Button>
      </div>

      {error && <p className="text-sm text-rw-danger">{error}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer ownership?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-rw-text-muted">
              Are you sure you want to transfer ownership to{' '}
              <span className="font-medium text-rw-text-primary">
                {selectedEditor?.firstName} {selectedEditor?.lastName}
              </span>
              ? This action can only be reversed by the new owner.
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button onClick={handleTransfer} disabled={isPending}>
              {isPending ? 'Transferring…' : 'Transfer ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

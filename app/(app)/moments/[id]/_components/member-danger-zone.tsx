'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { leaveMoment, deleteMoment } from '../actions'

// ─── Leave moment section (non-owners) ───────────────────────────────────────

export function LeaveSection({ momentId }: { momentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deletePosts, setDeletePosts] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const res = await leaveMoment(momentId, deletePosts)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/home')
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Leave moment</p>
        <p className="text-sm text-rw-text-muted">You will lose access to this moment.</p>
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
        <DialogTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-rw-danger text-rw-danger hover:bg-rw-danger-subtle"
            />
          }
        >
          <LogOut className="size-3.5" />
          Leave
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this moment?</DialogTitle>
          </DialogHeader>
          <DialogBody className="pt-5 gap-4">
            <p className="text-sm text-rw-text-muted">
              You will lose access to this moment. What would you like to do with your posts?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setDeletePosts(false)}
                className={cn(
                  'flex items-start rounded-lg border p-3 text-left transition-colors',
                  !deletePosts
                    ? 'border-rw-accent bg-rw-accent-subtle/30 text-rw-text-primary'
                    : 'border-rw-border text-rw-text-muted hover:border-rw-accent hover:text-rw-text-primary'
                )}
              >
                <div>
                  <p className="text-sm font-medium">Keep my posts</p>
                  <p className="text-xs text-rw-text-muted mt-0.5">
                    Your posts remain visible to other members.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDeletePosts(true)}
                className={cn(
                  'flex items-start rounded-lg border p-3 text-left transition-colors',
                  deletePosts
                    ? 'border-rw-danger bg-rw-danger-subtle/30 text-rw-text-primary'
                    : 'border-rw-border text-rw-text-muted hover:border-rw-danger hover:text-rw-text-primary'
                )}
              >
                <div>
                  <p className="text-sm font-medium">Delete my posts</p>
                  <p className="text-xs text-rw-text-muted mt-0.5">
                    All posts you wrote will be permanently removed.
                  </p>
                </div>
              </button>
            </div>
            {error && <p className="text-sm text-rw-danger">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleLeave} disabled={isPending}>
              {isPending ? 'Leaving…' : 'Leave moment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Delete moment section (owner without editors) ────────────────────────────

export function DeleteMomentSection({
  momentId,
  momentName,
}: {
  momentId: string
  momentName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteMoment(momentId)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/home')
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Delete moment</p>
          <p className="text-sm text-rw-text-muted">
            Permanently delete this moment for everyone.
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this moment?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-rw-text-muted">
              This will permanently delete &ldquo;{momentName}&rdquo; and all its content for
              everyone. This cannot be undone.
            </p>
            {error && <p className="text-sm text-rw-danger">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete moment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Reader view (danger zone only) ──────────────────────────────────────────

export function ReaderView({ momentId }: { momentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const res = await leaveMoment(momentId, false)
      if (res.error) { setError(res.error); return }
      router.push('/home')
    })
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-4">
      <section className="rounded-rw-card border border-rw-danger/40 bg-rw-danger-subtle/40 py-5 px-6 space-y-4">
        <h2 className="font-sans text-[11px] font-semibold text-rw-danger uppercase tracking-[0.08em]">
          Danger Zone
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Leave moment</p>
            <p className="text-sm text-rw-text-muted">You will lose access to this moment.</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
            <DialogTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-rw-danger text-rw-danger hover:bg-rw-danger-subtle"
                />
              }
            >
              <LogOut className="size-3.5" />
              Leave
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Leave this moment?</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <p className="text-sm text-rw-text-muted">
                  Are you sure you want to leave? You will lose access to this moment.
                </p>
                {error && <p className="text-sm text-rw-danger">{error}</p>}
              </DialogBody>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={handleLeave} disabled={isPending}>
                  {isPending ? 'Leaving…' : 'Leave moment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  )
}

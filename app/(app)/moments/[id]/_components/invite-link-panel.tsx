'use client'

import { useState, useTransition, useEffect } from 'react'
import { Link2, Copy, Check, Trash2, RefreshCw } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { generateInviteLink, revokeInviteLink, type MomentDetail } from '../actions'

// Client-side copy of the expiry options + their labels (server validates the value).
type ExpiryOption = 'week' | 'month' | '3months' | '6months' | 'year' | 'never'

const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  week: '1 week',
  month: '1 month',
  '3months': '3 months',
  '6months': '6 months',
  year: '1 year',
  never: 'Never',
}

export function InviteLinkSection({
  momentId,
  initialLink,
}: {
  momentId: string
  initialLink: MomentDetail['inviteLink']
}) {
  const [link, setLink] = useState(initialLink)
  const [expiry, setExpiry] = useState<ExpiryOption>('month')
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const linkUrl = link && origin ? `${origin}/join/${link.token}` : ''

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const res = await generateInviteLink(momentId, expiry)
      if (res.error) {
        setError(res.error)
        return
      }
      setLink({
        token: res.token!,
        expiresAt: res.expiresAt ?? null,
        createdAt: new Date().toISOString(),
      })
      toast.success('Invite link generated')
    })
  }

  function handleRevoke() {
    setError(null)
    startTransition(async () => {
      const res = await revokeInviteLink(momentId)
      if (res.error) {
        setError(res.error)
        return
      }
      setLink(null)
      toast.success('Invite link revoked')
    })
  }

  function handleCopy() {
    if (!linkUrl) return
    navigator.clipboard.writeText(linkUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function formatExpiry(iso: string | null): string {
    if (!iso) return 'Never expires'
    const d = new Date(iso)
    return `Expires ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <div className="space-y-4">
      <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">
        Invite Link
      </h2>

      <p className="text-sm text-rw-text-muted">
        Share this link to invite people to view this moment as a reader. The link expires based on
        the option you choose. Generating a new link will automatically invalidate the previous one.
      </p>

      {link ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border border-rw-border-subtle bg-rw-surface-raised/50 px-3 py-1.5 min-w-0">
              <p className="text-xs text-rw-text-muted truncate font-mono">
                {linkUrl || '…'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!linkUrl}
              className="shrink-0 rounded-md border p-1.5 text-rw-text-muted hover:text-rw-accent hover:bg-rw-accent-subtle transition-colors disabled:opacity-40"
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="size-3.5 text-rw-accent" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-rw-text-muted">{formatExpiry(link.expiresAt)}</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                className="text-xs text-rw-text-muted hover:text-rw-danger transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="size-3" />
                Revoke
              </button>
              <span className="text-rw-text-muted/40">·</span>
              <GenerateLinkDialog
                expiry={expiry}
                onExpiryChange={setExpiry}
                onGenerate={handleGenerate}
                isPending={isPending}
                trigger={
                  <button
                    type="button"
                    className="text-xs text-rw-text-muted hover:text-rw-text-primary transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="size-3" />
                    New link
                  </button>
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <GenerateLinkDialog
          expiry={expiry}
          onExpiryChange={setExpiry}
          onGenerate={handleGenerate}
          isPending={isPending}
          trigger={
            <Button size="sm" variant="outline" className="w-full">
              <Link2 className="size-3.5" />
              Generate invite link
            </Button>
          }
        />
      )}

      {error && <p className="text-xs text-rw-danger">{error}</p>}
    </div>
  )
}

function GenerateLinkDialog({
  expiry,
  onExpiryChange,
  onGenerate,
  isPending,
  trigger,
}: {
  expiry: ExpiryOption
  onExpiryChange: (v: ExpiryOption) => void
  onGenerate: () => void
  isPending: boolean
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  function handleGenerate() {
    onGenerate()
    setOpen(false)
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Generate invite link</DialogTitle>
          </DialogHeader>
          <DialogBody className="pt-5 gap-4">
            <div className="space-y-1.5">
              <Label>Link expires in</Label>
              <Select value={expiry} onValueChange={(v) => { if (v !== null) onExpiryChange(v as ExpiryOption) }}>
                <SelectTrigger style={{ height: '2.5rem' }}>
                  <SelectValue>{EXPIRY_LABELS[expiry]}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {(Object.keys(EXPIRY_LABELS) as ExpiryOption[]).map((opt) => (
                    <SelectItem key={opt} value={opt}>{EXPIRY_LABELS[opt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-rw-text-muted">
              Generating a new link revokes any existing one. People who already joined keep their
              access.
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? 'Generating…' : 'Generate link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

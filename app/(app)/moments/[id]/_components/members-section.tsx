'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Shield, Eye, X, UserPlus, Link2, Copy, Check, Trash2, LogOut, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  inviteMember,
  removeMember,
  generateInviteLink,
  revokeInviteLink,
  leaveMoment,
  transferOwnership,
  type MomentDetail,
  type MomentMemberFull,
} from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
  myUserId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersSection({ moment, myRole, myStatus, myUserId }: Props) {
  const canInvite = myStatus === 'accepted' && (myRole === 'owner' || myRole === 'editor')
  const canManageLink = myStatus === 'accepted' && (myRole === 'owner' || myRole === 'editor')
  const isAccepted = myStatus === 'accepted'

  const owner: MomentMemberFull = {
    id: '__owner__',
    userId: moment.ownerId,
    firstName: moment.ownerFirstName,
    lastName: moment.ownerLastName,
    photoUrl: moment.ownerPhotoUrl,
    role: 'editor',
    status: 'accepted',
    invitedBy: null,
  }
  const nonOwnerMembers = moment.members.filter((m) => m.userId !== moment.ownerId)
  const acceptedEditors = nonOwnerMembers.filter((m) => m.role === 'editor' && m.status === 'accepted')

  const editors = nonOwnerMembers.filter((m) => m.role === 'editor')
  const readers = nonOwnerMembers.filter((m) => m.role === 'reader')

  // Owners and editors see the manage view; readers see a simple people list
  const isManager = isAccepted && (myRole === 'owner' || myRole === 'editor')

  if (!isManager) {
    // Reader view: simple flat list, no remove buttons
    return (
      <section className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">People</h2>
        <ul className="space-y-2">
          <MemberRow member={owner} isOwner canRemove={false} />
          {nonOwnerMembers.map((m) => (
            <MemberRow key={m.id} member={m} isOwner={false} canRemove={false} />
          ))}
        </ul>
        {isAccepted && myRole !== 'owner' && (
          <LeaveMomentDialog momentId={moment.id} />
        )}
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Manage members
        </h2>
        {canInvite && <InviteDialog momentId={moment.id} myRole={myRole} />}
      </div>

      {/* ── Editors ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Shield className="size-3" /> Editors
        </p>
        <ul className="space-y-2">
          <MemberRow member={owner} isOwner canRemove={false} />
          {editors.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isOwner={false}
              // Only the owner can remove editors
              canRemove={myRole === 'owner' && m.userId !== myUserId && m.status === 'accepted'}
              momentId={moment.id}
            />
          ))}
        </ul>
      </div>

      {/* ── Readers ──────────────────────────────────────────────── */}
      {readers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Eye className="size-3" /> Readers
          </p>
          <ul className="space-y-2">
            {readers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isOwner={false}
                // Owners and editors can remove readers
                canRemove={m.userId !== myUserId && m.status === 'accepted'}
                momentId={moment.id}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Shareable invite link */}
      {canManageLink && (
        <InviteLinkSection momentId={moment.id} initialLink={moment.inviteLink} />
      )}

      {/* Transfer ownership (owner only) */}
      {myRole === 'owner' && acceptedEditors.length > 0 && (
        <TransferOwnershipDialog momentId={moment.id} editors={acceptedEditors} />
      )}

      {/* Leave moment (non-owners who have accepted) */}
      {isAccepted && myRole !== 'owner' && (
        <LeaveMomentDialog momentId={moment.id} />
      )}
    </section>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwner,
  canRemove,
  momentId,
}: {
  member: MomentMemberFull
  isOwner: boolean
  canRemove: boolean
  momentId?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()

  function handleRemove() {
    if (!momentId) return
    startTransition(async () => {
      const res = await removeMember(momentId, member.id)
      if (res.error) setError(res.error)
    })
  }

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={member.photoUrl ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">
              {member.firstName} {member.lastName}
            </span>
            {isOwner && <Crown className="size-3 text-amber-500 shrink-0" />}
          </div>
          {!isOwner && (
            <RoleBadge role={member.role} status={member.status} />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          aria-label={`Remove ${member.firstName}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  )
}

function RoleBadge({ role, status }: { role: 'editor' | 'reader'; status: string }) {
  if (status === 'pending') {
    return <span className="text-xs text-muted-foreground">Invited</span>
  }
  if (status === 'declined') {
    return <span className="text-xs text-muted-foreground line-through">Declined</span>
  }
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs text-muted-foreground')}>
      {role === 'editor' ? (
        <><Shield className="size-2.5" /> Editor</>
      ) : (
        <><Eye className="size-2.5" /> Reader</>
      )}
    </span>
  )
}

// ─── Invite dialog (by username / email) ──────────────────────────────────────

export function InviteDialog({ momentId, myRole }: { momentId: string; myRole: 'owner' | 'editor' | 'reader' }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [role, setRole] = useState<'editor' | 'reader'>('reader')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canInviteEditors = myRole === 'owner'

  function handleSubmit() {
    const val = input.trim()
    if (!val) return
    setError(null)

    startTransition(async () => {
      const res = await inviteMember(momentId, val, role)
      if (res.error) {
        setError(res.error)
        return
      }
      setInput('')
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setInput(''); setError(null) } }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="size-3.5" />
        Invite
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="invite-input">Username or email</Label>
            <Input
              id="invite-input"
              placeholder="username or email@example.com"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              {canInviteEditors && (
                <RoleButton
                  active={role === 'editor'}
                  onClick={() => setRole('editor')}
                  icon={<Shield className="size-3.5" />}
                  label="Editor"
                  description="Can post and edit"
                />
              )}
              <RoleButton
                active={role === 'reader'}
                onClick={() => setRole('reader')}
                icon={<Eye className="size-3.5" />}
                label="Reader"
                description="View only"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!input.trim() || isPending}>
            {isPending ? 'Inviting…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:border-ring hover:text-foreground'
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium leading-none">{label}</p>
        <p className="text-[10px] mt-0.5 opacity-70">{description}</p>
      </div>
    </button>
  )
}

// ─── Invite link section ──────────────────────────────────────────────────────

type ExpiryOption = 'week' | 'month' | '3months' | '6months' | 'year' | 'never'

const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  week: '1 week',
  month: '1 month',
  '3months': '3 months',
  '6months': '6 months',
  year: '1 year',
  never: 'Never',
}

function InviteLinkSection({
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
      if (res.error) { setError(res.error); return }
      setLink({ token: res.token!, expiresAt: res.expiresAt ?? null, createdAt: new Date().toISOString() })
    })
  }

  function handleRevoke() {
    setError(null)
    startTransition(async () => {
      const res = await revokeInviteLink(momentId)
      if (res.error) { setError(res.error); return }
      setLink(null)
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
    <div className="pt-2 border-t space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invite link</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Share this link to invite people to view this moment as a reader. The link expires based on the option you choose. Generating a new link will automatically invalidate the previous one.
      </p>

      {link ? (
        <div className="space-y-2">
          {/* URL row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-1.5 min-w-0">
              <p className="text-xs text-muted-foreground truncate font-mono">{linkUrl || '…'}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!linkUrl}
              className="shrink-0 rounded-md border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              aria-label="Copy link"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            </button>
          </div>

          {/* Expiry + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">{formatExpiry(link.expiresAt)}</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="size-3" />
                Revoke
              </button>
              <span className="text-muted-foreground/40">·</span>
              <GenerateDialog
                expiry={expiry}
                onExpiryChange={setExpiry}
                onGenerate={handleGenerate}
                isPending={isPending}
                trigger={
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
        <GenerateDialog
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

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function GenerateDialog({
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
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'contents' }}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Generate invite link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="expiry-select">Link expires in</Label>
            <select
              id="expiry-select"
              value={expiry}
              onChange={(e) => onExpiryChange(e.target.value as ExpiryOption)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.keys(EXPIRY_LABELS) as ExpiryOption[]).map((opt) => (
                <option key={opt} value={opt}>{EXPIRY_LABELS[opt]}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Generating a new link revokes any existing one. People who already joined keep their access.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? 'Generating…' : 'Generate link'}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Leave moment dialog ──────────────────────────────────────────────────────

function LeaveMomentDialog({ momentId }: { momentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deletePosts, setDeletePosts] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const res = await leaveMoment(momentId, deletePosts)
      if (res.error) { setError(res.error); return }
      router.push('/home')
    })
  }

  return (
    <div className="pt-2 border-t">
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
        <DialogTrigger render={<Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive w-full justify-start" />}>
          <LogOut className="size-3.5" />
          Leave moment
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Leave this moment?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              You will lose access to this moment. What would you like to do with your entries?
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="leave-posts"
                  checked={!deletePosts}
                  onChange={() => setDeletePosts(false)}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium">Keep my entries</p>
                  <p className="text-xs text-muted-foreground">Your entries remain visible to other members.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="leave-posts"
                  checked={deletePosts}
                  onChange={() => setDeletePosts(true)}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium">Delete my entries</p>
                  <p className="text-xs text-muted-foreground">All entries you wrote will be permanently removed.</p>
                </div>
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeave} disabled={isPending}>
              {isPending ? 'Leaving…' : 'Leave moment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Transfer ownership dialog ────────────────────────────────────────────────

function TransferOwnershipDialog({
  momentId,
  editors,
}: {
  momentId: string
  editors: MomentMemberFull[]
}) {
  const [open, setOpen] = useState(false)
  const [newOwnerId, setNewOwnerId] = useState(editors[0]?.userId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleTransfer() {
    if (!newOwnerId) return
    setError(null)
    startTransition(async () => {
      const res = await transferOwnership(momentId, newOwnerId)
      if (res.error) { setError(res.error); return }
      setOpen(false)
    })
  }

  return (
    <div className="pt-2 border-t">
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
        <DialogTrigger render={<Button size="sm" variant="ghost" className="text-muted-foreground w-full justify-start" />}>
          <Crown className="size-3.5" />
          Transfer ownership
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Choose an editor to become the new owner. You will become an editor.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-owner-select">New owner</Label>
              <select
                id="new-owner-select"
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {editors.map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={isPending || !newOwnerId}>
              {isPending ? 'Transferring…' : 'Transfer ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown, Shield, Eye, X, UserPlus, Link2, Copy, Check, Trash2,
  LogOut, RefreshCw, Pencil,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import {
  inviteMember,
  removeMember,
  updateMemberRole,
  generateInviteLink,
  revokeInviteLink,
  leaveMoment,
  transferOwnership,
  deleteMoment,
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

// ─── Main component ───────────────────────────────────────────────────────────

export function MembersSection({ moment, myRole, myStatus, myUserId }: Props) {
  const isAccepted = myStatus === 'accepted'
  const isOwner = myRole === 'owner'
  const canManageLink = isAccepted && (isOwner || myRole === 'editor')

  const nonOwnerMembers = moment.members.filter((m) => m.userId !== moment.ownerId)
  const acceptedEditors = nonOwnerMembers.filter(
    (m) => m.role === 'editor' && m.status === 'accepted'
  )

  const owner: MomentMemberFull = {
    id: '__owner__',
    userId: moment.ownerId,
    firstName: moment.ownerFirstName,
    lastName: moment.ownerLastName,
    photoUrl: moment.ownerPhotoUrl,
    invitedEmail: null,
    role: 'editor',
    status: 'accepted',
    invitedBy: null,
  }

  const sortByName = (a: MomentMemberFull, b: MomentMemberFull) =>
    `${a.firstName} ${a.lastName}`.toLowerCase()
      .localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase())

  const sortedEditors = [...nonOwnerMembers.filter((m) => m.role === 'editor')].sort(sortByName)
  const sortedReaders = [...nonOwnerMembers.filter((m) => m.role === 'reader')].sort(sortByName)

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-8">

      {/* ── Section 1: Manage Members ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Manage Members
          </h2>
          {isAccepted && (isOwner || myRole === 'editor') && (
            <InviteDialog momentId={moment.id} myRole={myRole} />
          )}
        </div>

        <ul className="space-y-2.5">
          {/* Owner row — no edit icon */}
          <MemberRow
            member={owner}
            isOwnerRow
            showEditMenu={false}
            momentId={moment.id}
          />
          {/* Editors (alphabetical) */}
          {sortedEditors.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isOwnerRow={false}
              showEditMenu={isOwner && m.userId !== myUserId}
              momentId={moment.id}
            />
          ))}
          {/* Readers (alphabetical) */}
          {sortedReaders.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isOwnerRow={false}
              showEditMenu={isOwner && m.userId !== myUserId}
              momentId={moment.id}
            />
          ))}
        </ul>
      </section>

      <Separator />

      {/* ── Section 2: Invite Link (owners + editors) ─────────── */}
      {canManageLink && (
        <>
          <section>
            <InviteLinkSection momentId={moment.id} initialLink={moment.inviteLink} />
          </section>
          <Separator />
        </>
      )}

      {/* ── Section 3: Transfer Ownership (owner only) ────────── */}
      {isOwner && isAccepted && (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Transfer Ownership
            </h2>
            {acceptedEditors.length > 0 ? (
              <TransferOwnershipSection momentId={moment.id} editors={acceptedEditors} />
            ) : (
              <p className="text-sm text-muted-foreground">
                You must promote a reader to editor before you can transfer ownership.
              </p>
            )}
          </section>
          <Separator />
        </>
      )}

      {/* ── Section 4: Leave / Delete (danger zone) ───────────── */}
      {isAccepted && (
        <section className="rounded-lg border border-destructive/40 p-5 space-y-4">
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wide">
            Danger Zone
          </h2>

          {!isOwner ? (
            /* Editor / Reader — leave with post choice */
            <LeaveSection momentId={moment.id} />
          ) : acceptedEditors.length > 0 ? (
            /* Owner with editors — must transfer first */
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Leave moment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  To leave this moment, you must first transfer ownership to an editor using
                  the Transfer Ownership section above.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive/50"
                disabled
              >
                <LogOut className="size-3.5" />
                Leave moment
              </Button>
            </div>
          ) : (
            /* Owner without editors — can delete moment */
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Leave moment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You cannot leave this moment without an editor to transfer ownership to. You can
                  promote a reader to editor in the Manage Members section above and then transfer
                  ownership, or you can delete this moment for everyone.
                </p>
              </div>
              <DeleteMomentSection momentId={moment.id} momentName={moment.name} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwnerRow,
  showEditMenu,
  momentId,
}: {
  member: MomentMemberFull
  isOwnerRow: boolean
  showEditMenu: boolean
  momentId?: string
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isUnregistered = !member.userId && !!member.invitedEmail
  const initials = isUnregistered
    ? (member.invitedEmail![0] ?? '?').toUpperCase()
    : `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()
  const displayName = isUnregistered
    ? member.invitedEmail!
    : `${member.firstName} ${member.lastName}`

  function handleRoleChange(newRole: 'editor' | 'reader') {
    if (!momentId) return
    startTransition(async () => {
      const res = await updateMemberRole(momentId, member.id, newRole)
      if (res.error) setError(res.error)
    })
  }

  function handleRemove() {
    if (!momentId) return
    setConfirmRemove(false)
    startTransition(async () => {
      const res = await removeMember(momentId, member.id)
      if (res.error) setError(res.error)
    })
  }

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="size-8 shrink-0">
          {!isUnregistered && <AvatarImage src={member.photoUrl ?? undefined} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{displayName}</span>
            {isOwnerRow && <Crown className="size-3 text-amber-500 shrink-0" />}
          </div>
          {!isOwnerRow && (
            <RoleBadge
              role={member.role}
              status={member.status}
              isUnregistered={isUnregistered}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {showEditMenu && (
          <>
            <Menu>
              <MenuTrigger
                disabled={isPending}
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                aria-label={`Edit ${displayName}`}
              >
                <Pencil className="size-3.5" />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem
                  onClick={() =>
                    handleRoleChange(member.role === 'editor' ? 'reader' : 'editor')
                  }
                >
                  {member.role === 'editor' ? (
                    <><Eye className="size-3.5" /> Make reader</>
                  ) : (
                    <><Shield className="size-3.5" /> Make editor</>
                  )}
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmRemove(true)}
                >
                  <X className="size-3.5" />
                  Remove
                </MenuItem>
              </MenuContent>
            </Menu>

            <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Remove member?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to remove{' '}
                  <span className="font-medium text-foreground">{displayName}</span> from this
                  moment?
                </p>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmRemove(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
                    {isPending ? 'Removing…' : 'Remove'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </li>
  )
}

function RoleBadge({
  role,
  status,
  isUnregistered,
}: {
  role: 'editor' | 'reader'
  status: string
  isUnregistered?: boolean
}) {
  if (status === 'pending') {
    return (
      <span className="text-xs text-muted-foreground">
        {isUnregistered ? 'Invite sent (not yet registered)' : 'Invited'}
      </span>
    )
  }
  if (status === 'declined') {
    return <span className="text-xs text-muted-foreground line-through">Declined</span>
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      {role === 'editor' ? (
        <><Shield className="size-2.5" /> Editor</>
      ) : (
        <><Eye className="size-2.5" /> Reader</>
      )}
    </span>
  )
}

// ─── Invite dialog (multi-step: role → lookup method → result) ────────────────

type InviteStep = 'role' | 'lookup'
type LookupMethod = 'username' | 'email'
type FeedbackKind =
  | 'error'
  | 'not_found'
  | 'success_user'
  | 'success_email_registered'
  | 'success_email_unregistered'

interface InviteFeedback {
  kind: FeedbackKind
  message: string
}

export function InviteDialog({
  momentId,
  myRole,
}: {
  momentId: string
  myRole: 'owner' | 'editor' | 'reader'
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<InviteStep>('role')
  const [role, setRole] = useState<'editor' | 'reader'>('reader')
  const [method, setMethod] = useState<LookupMethod>('username')
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<InviteFeedback | null>(null)

  const canInviteEditors = myRole === 'owner'

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) {
      setStep('role')
      setRole('reader')
      setMethod('username')
      setInput('')
      setFeedback(null)
    }
  }

  function handleSend() {
    const val = input.trim()
    if (!val) return
    setFeedback(null)

    startTransition(async () => {
      const res = await inviteMember(momentId, method, val, role)

      if ('error' in res) {
        setFeedback({ kind: 'error', message: res.error })
        return
      }
      if ('notFound' in res) {
        setFeedback({
          kind: 'not_found',
          message:
            'No account found with that username. Try a different username or invite by email instead.',
        })
        return
      }
      if (res.success === 'email_unregistered') {
        setFeedback({
          kind: 'success_email_unregistered',
          message:
            "No account found with that email. The invite is saved — they'll see it automatically when they sign up with this address.",
        })
        setInput('')
        return
      }
      const username = res.invitedUsername
      setFeedback({
        kind: res.success === 'user' ? 'success_user' : 'success_email_registered',
        message: `Invite successfully sent to @${username}.`,
      })
      setInput('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="size-3.5" />
        <span className="hidden sm:inline">Invite</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
        </DialogHeader>

        {step === 'role' ? (
          <>
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">What role should they have?</p>
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
            <DialogFooter>
              <Button onClick={() => setStep('lookup')}>Next</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {role === 'editor' ? <Shield className="size-3" /> : <Eye className="size-3" />}
                Inviting as{' '}
                <span className="font-medium text-foreground capitalize">{role}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('role')
                    setFeedback(null)
                    setInput('')
                  }}
                  className="ml-auto text-xs underline underline-offset-2 hover:text-foreground"
                >
                  Change
                </button>
              </div>

              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('username')
                    setFeedback(null)
                    setInput('')
                  }}
                  className={cn(
                    'flex-1 py-1.5 text-center transition-colors',
                    method === 'username'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Username
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('email')
                    setFeedback(null)
                    setInput('')
                  }}
                  className={cn(
                    'flex-1 py-1.5 text-center transition-colors',
                    method === 'email'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  Email
                </button>
              </div>

              <div className="space-y-1.5">
                <Input
                  placeholder={method === 'username' ? '@username' : 'email@example.com'}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setFeedback(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  autoFocus
                  type={method === 'email' ? 'email' : 'text'}
                />
              </div>

              {feedback && (
                <p
                  className={cn(
                    'text-sm rounded-md px-3 py-2',
                    feedback.kind === 'error' || feedback.kind === 'not_found'
                      ? 'bg-destructive/10 text-destructive'
                      : feedback.kind === 'success_email_unregistered'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-green-500/10 text-green-700 dark:text-green-400'
                  )}
                >
                  {feedback.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSend} disabled={!input.trim() || isPending}>
                {isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </>
        )}
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
      if (res.error) {
        setError(res.error)
        return
      }
      setLink({
        token: res.token!,
        expiresAt: res.expiresAt ?? null,
        createdAt: new Date().toISOString(),
      })
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
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Invite Link
      </h2>

      <p className="text-sm text-muted-foreground">
        Share this link to invite people to view this moment as a reader. The link expires based on
        the option you choose. Generating a new link will automatically invalidate the previous one.
      </p>

      {link ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-1.5 min-w-0">
              <p className="text-xs text-muted-foreground truncate font-mono">
                {linkUrl || '…'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!linkUrl}
              className="shrink-0 rounded-md border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

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
              <GenerateLinkDialog
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

      {error && <p className="text-xs text-destructive">{error}</p>}
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
                  <option key={opt} value={opt}>
                    {EXPIRY_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Generating a new link revokes any existing one. People who already joined keep their
              access.
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

// ─── Transfer ownership section ───────────────────────────────────────────────

function TransferOwnershipSection({
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
      <p className="text-sm text-muted-foreground">
        Transfer ownership to an editor. You will become an editor. This action can only be
        reversed by the new owner.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="transfer-owner-select">New owner</Label>
          <select
            id="transfer-owner-select"
            value={newOwnerId}
            onChange={(e) => setNewOwnerId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {editors.map((e) => (
              <option key={e.userId} value={e.userId!}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={!newOwnerId || isPending}
        >
          {isPending ? 'Transferring…' : 'Transfer'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer ownership?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to transfer ownership to{' '}
            <span className="font-medium text-foreground">
              {selectedEditor?.firstName} {selectedEditor?.lastName}
            </span>
            ? This action can only be reversed by the new owner.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={isPending}>
              {isPending ? 'Transferring…' : 'Transfer ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Leave moment section (non-owners) ───────────────────────────────────────

function LeaveSection({ momentId }: { momentId: string }) {
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
        <p className="text-sm text-muted-foreground">You will lose access to this moment.</p>
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
        <DialogTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
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
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              You will lose access to this moment. What would you like to do with your posts?
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
                  <p className="text-sm font-medium">Keep my posts</p>
                  <p className="text-xs text-muted-foreground">
                    Your posts remain visible to other members.
                  </p>
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
                  <p className="text-sm font-medium">Delete my posts</p>
                  <p className="text-xs text-muted-foreground">
                    All posts you wrote will be permanently removed.
                  </p>
                </div>
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
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

function DeleteMomentSection({
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
          <p className="text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            This will permanently delete &ldquo;{momentName}&rdquo; and all its content for
            everyone. This cannot be undone.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Delete moment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

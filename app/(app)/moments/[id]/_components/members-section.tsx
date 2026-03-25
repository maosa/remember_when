'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown, PenTool, Eye, X, UserPlus, Link2, Copy, Check, Trash2,
  LogOut, RefreshCw, Pencil, ChevronDown, Mail, Loader2, CheckCircle, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  // Readers see only the danger zone with a simple leave button
  if (myRole === 'reader' && myStatus === 'accepted') {
    return <ReaderView momentId={moment.id} />
  }

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
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-4 space-y-8 pb-12">

      {/* ── Section 1: Manage Members ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">
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
            <h2 className="font-sans text-xs font-semibold text-rw-text-muted uppercase tracking-widest">
              Transfer Ownership
            </h2>
            {acceptedEditors.length > 0 ? (
              <TransferOwnershipSection momentId={moment.id} editors={acceptedEditors} />
            ) : (
              <p className="text-sm text-rw-text-muted">
                You must promote a reader to editor before you can transfer ownership.
              </p>
            )}
          </section>
          <Separator />
        </>
      )}

      {/* ── Section 4: Leave / Delete (danger zone) ───────────── */}
      {isAccepted && (
        <section className="rounded-rw-card border border-rw-danger/40 bg-rw-danger-subtle/40 py-5 px-6 space-y-4">
          <h2 className="font-sans text-[11px] font-semibold text-rw-danger uppercase tracking-[0.08em]">
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
                <p className="text-sm text-rw-text-muted mt-1">
                  To leave this moment, you must first transfer ownership to an editor using
                  the Transfer Ownership section above.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-rw-danger/40 text-rw-danger/50"
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
                <p className="text-sm text-rw-text-muted mt-1">
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
          <span className="text-sm font-medium truncate block">{displayName}</span>
          {isOwnerRow ? (
            <RoleBadge role="owner" status="accepted" />
          ) : (
            <RoleBadge
              role={member.role}
              status={member.status}
              isUnregistered={isUnregistered}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && <p className="text-xs text-rw-danger">{error}</p>}

        {showEditMenu && (
          <>
            <Menu>
              <MenuTrigger
                disabled={isPending}
                className="rounded p-1 text-rw-text-muted hover:text-rw-text-primary transition-colors disabled:opacity-40"
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
                    <><PenTool className="size-3.5" /> Make editor</>
                  )}
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  className="text-rw-danger focus:text-rw-danger"
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
                <DialogBody>
                  <p className="text-sm text-rw-text-muted">
                    Are you sure you want to remove{' '}
                    <span className="font-medium text-rw-text-primary">{displayName}</span> from this
                    moment?
                  </p>
                </DialogBody>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
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
  role: 'owner' | 'editor' | 'reader'
  status: string
  isUnregistered?: boolean
}) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-rw-text-muted">
        <Mail className="size-2.5" />
        {isUnregistered ? 'Invite sent (not yet registered)' : 'Invited'}
      </span>
    )
  }
  if (status === 'declined') {
    return <span className="text-xs text-rw-text-muted line-through">Declined</span>
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-rw-text-muted">
      {role === 'owner' && <><Crown className="size-2.5" /> Owner</>}
      {role === 'editor' && <><PenTool className="size-2.5" /> Editor</>}
      {role === 'reader' && <><Eye className="size-2.5" /> Reader</>}
    </span>
  )
}

// ─── Invite dialog (multi-step: role → lookup method → result) ────────────────

type InviteStep = 'role' | 'lookup'
type LookupMethod = 'username' | 'email'
type LookupStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'unregistered' | 'invalid_email'
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteDialog({
  momentId,
  myRole,
  buttonClassName,
}: {
  momentId: string
  myRole: 'owner' | 'editor' | 'reader'
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<InviteStep>('role')
  const [role, setRole] = useState<'editor' | 'reader'>('reader')
  const [method, setMethod] = useState<LookupMethod>('username')
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<InviteFeedback | null>(null)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [lookupDisplay, setLookupDisplay] = useState<string>('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Debounced real-time lookup ───────────────────────────────────────────────
  useEffect(() => {
    const val = input.trim().replace(/^@/, '')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    if (!val) { setLookupStatus('idle'); setLookupDisplay(''); return }

    if (method === 'email' && !EMAIL_RE.test(val)) {
      setLookupStatus('invalid_email'); setLookupDisplay(''); return
    }

    setLookupStatus('checking')
    setLookupDisplay('')

    debounceTimer.current = setTimeout(async () => {
      const supabase = createClient()
      if (method === 'username') {
        const { data } = await supabase
          .from('users')
          .select('username, first_name, last_name')
          .eq('username', val.toLowerCase())
          .maybeSingle()
        if (data) {
          setLookupStatus('found')
          setLookupDisplay(`@${data.username} (${data.first_name} ${data.last_name})`)
        } else {
          setLookupStatus('not_found')
        }
      } else {
        const { data } = await supabase
          .from('users')
          .select('username, first_name, last_name')
          .eq('email', val.toLowerCase())
          .maybeSingle()
        if (data) {
          setLookupStatus('found')
          setLookupDisplay(`@${data.username} (${data.first_name} ${data.last_name})`)
        } else {
          setLookupStatus('unregistered')
        }
      }
    }, 500)

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [input, method])

  function resetLookup() {
    setLookupStatus('idle')
    setLookupDisplay('')
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }

  function handleOpen(v: boolean) {
    setOpen(v)
    if (!v) {
      setStep('role')
      setRole('reader')
      setMethod('username')
      setInput('')
      setFeedback(null)
      resetLookup()
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
          message: 'No account found with that username. Try a different username or invite by email instead.',
        })
        return
      }
      if (res.success === 'email_unregistered') {
        setFeedback({
          kind: 'success_email_unregistered',
          message: "No account found with that email. We've sent them an invite to join Remember When and accept your invitation.",
        })
        setInput('')
        resetLookup()
        return
      }
      const username = res.invitedUsername
      setFeedback({
        kind: res.success === 'user' ? 'success_user' : 'success_email_registered',
        message: `Invite successfully sent to @${username}.`,
      })
      setInput('')
      resetLookup()
    })
  }

  // "Send invite" is only enabled when we know what we're sending to
  const canSend = !isPending && (lookupStatus === 'found' || lookupStatus === 'unregistered')

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className={buttonClassName} aria-label="Invite someone" />}>
        <UserPlus className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
        </DialogHeader>

        {step === 'role' ? (
          <>
            <DialogBody className="gap-3">
              <p className="text-sm text-rw-text-muted">What role should they have?</p>
              <div className="flex gap-2">
                <RoleButton
                  active={role === 'editor'}
                  onClick={() => setRole('editor')}
                  icon={<PenTool className="size-3.5" />}
                  label="Editor"
                  description="Can post and edit"
                />
                <RoleButton
                  active={role === 'reader'}
                  onClick={() => setRole('reader')}
                  icon={<Eye className="size-3.5" />}
                  label="Reader"
                  description="View only"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setStep('lookup')}>Next</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="gap-4">
              {/* Role indicator + change */}
              <div className="flex items-center gap-1.5 text-xs text-rw-text-muted">
                {role === 'editor' ? <PenTool className="size-3" /> : <Eye className="size-3" />}
                Inviting as{' '}
                <span className="font-medium text-rw-text-primary capitalize">{role}</span>
                <button
                  type="button"
                  onClick={() => { setStep('role'); setFeedback(null); setInput(''); resetLookup() }}
                  className="ml-auto text-xs underline underline-offset-2 hover:text-rw-text-primary"
                >
                  Change
                </button>
              </div>

              {/* Method toggle */}
              <div className="flex rounded-md border overflow-hidden text-sm">
                {(['username', 'email'] as LookupMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setFeedback(null); setInput(''); resetLookup() }}
                    className={cn(
                      'flex-1 py-1.5 text-center capitalize transition-colors',
                      method === m
                        ? 'bg-rw-accent text-white font-medium'
                        : 'text-rw-text-muted hover:bg-rw-surface-raised'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Input + inline lookup indicator */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    placeholder={method === 'username' ? '@username' : 'email@example.com'}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setFeedback(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && canSend && handleSend()}
                    autoFocus
                    type={method === 'email' ? 'email' : 'text'}
                    className="pr-8"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {lookupStatus === 'checking' && <Loader2 className="size-4 animate-spin text-rw-text-placeholder" />}
                    {lookupStatus === 'found' && <CheckCircle className="size-4 text-rw-accent" />}
                    {(lookupStatus === 'not_found' || lookupStatus === 'invalid_email') && <XCircle className="size-4 text-rw-danger" />}
                  </div>
                </div>

                {/* Lookup hints — shown before sending */}
                {!feedback && (
                  <>
                    {lookupStatus === 'found' && (
                      <p className="text-xs text-rw-accent">{lookupDisplay}</p>
                    )}
                    {lookupStatus === 'not_found' && method === 'username' && (
                      <p className="text-xs text-rw-danger">No account with this username. Try inviting by email instead.</p>
                    )}
                    {lookupStatus === 'unregistered' && (
                      <p className="text-xs text-rw-text-muted">Not registered — they'll receive an invite email to join.</p>
                    )}
                    {lookupStatus === 'invalid_email' && (
                      <p className="text-xs text-rw-text-muted">Enter a valid email address.</p>
                    )}
                  </>
                )}
              </div>

              {/* Post-send feedback */}
              {feedback && (
                <p
                  className={cn(
                    'text-sm rounded-md px-3 py-2',
                    feedback.kind === 'error' || feedback.kind === 'not_found'
                      ? 'bg-rw-danger-subtle text-rw-danger'
                      : feedback.kind === 'success_email_unregistered'
                      ? 'bg-rw-blue-subtle text-rw-blue'
                      : 'bg-rw-accent-subtle text-rw-accent'
                  )}
                >
                  {feedback.message}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button onClick={handleSend} disabled={!canSend}>
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
          ? 'border-rw-accent bg-rw-accent-subtle/30 text-rw-text-primary'
          : 'border-rw-border text-rw-text-muted hover:border-rw-accent hover:text-rw-text-primary'
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
                  <SelectValue />
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

function ReaderView({ momentId }: { momentId: string }) {
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

'use client'

import { useState, useTransition } from 'react'
import { Crown, Shield, Eye, X, UserPlus } from 'lucide-react'
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
import { inviteMember, removeMember, type MomentDetail, type MomentMemberFull } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembersSection({ moment, myRole, myStatus }: Props) {
  const canInvite = myStatus === 'accepted' && (myRole === 'owner' || myRole === 'editor')
  const canManage = myRole === 'owner'

  // All participants: owner + members
  const owner: MomentMemberFull = {
    id: '__owner__',
    userId: moment.ownerId,
    firstName: moment.ownerFirstName,
    lastName: moment.ownerLastName,
    photoUrl: moment.ownerPhotoUrl,
    role: 'editor', // not used for display
    status: 'accepted',
    invitedBy: null,
  }
  const nonOwnerMembers = moment.members.filter((m) => m.userId !== moment.ownerId)

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">People</h2>
        {canInvite && <InviteDialog momentId={moment.id} myRole={myRole} />}
      </div>

      <ul className="space-y-2">
        {/* Owner */}
        <MemberRow member={owner} isOwner canManage={false} />

        {/* Other members */}
        {nonOwnerMembers.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isOwner={false}
            canManage={canManage}
            momentId={moment.id}
          />
        ))}
      </ul>
    </section>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwner,
  canManage,
  momentId,
}: {
  member: MomentMemberFull
  isOwner: boolean
  canManage: boolean
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
      {canManage && !isOwner && (
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

// ─── Invite dialog ────────────────────────────────────────────────────────────

function InviteDialog({ momentId, myRole }: { momentId: string; myRole: 'owner' | 'editor' | 'reader' }) {
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

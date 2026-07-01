'use client'

import { useState, useTransition } from 'react'
import { Crown, PenTool, Eye, X, Pencil, Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from '@/components/ui/menu'
import { toast } from 'sonner'
import { removeMember, updateMemberRole, type MomentMemberFull } from '../actions'

export function MemberRow({
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
      else toast.success('Role updated')
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

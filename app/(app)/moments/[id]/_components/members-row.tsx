'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Crown, PenTool, Eye, Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/button-variants'
import { InviteDialog } from './members-section'
import { CoverPhotoSection } from './cover-photo-section'
import { type MomentDetail } from '../actions'

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
  canEdit: boolean
}

export function MembersRow({ moment, myRole, myStatus, canEdit }: Props) {

  const acceptedNonOwner = moment.members.filter(
    (m) => m.userId && m.userId !== moment.ownerId && m.status === 'accepted'
  )

  // Build ordered display list: owner first, then accepted registered members
  const allMembers = [
    { userId: moment.ownerId, firstName: moment.ownerFirstName, lastName: moment.ownerLastName, photoUrl: moment.ownerPhotoUrl, role: 'owner' as const },
    ...acceptedNonOwner.map((m) => ({ userId: m.userId!, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl, role: m.role })),
  ]

  const SHOWN = 5
  const shownMembers = allMembers.slice(0, SHOWN)
  const overflow = allMembers.length - SHOWN

  // Popover
  const [popoverOpen, setPopoverOpen] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEnter() {
    leaveTimer.current && clearTimeout(leaveTimer.current)
    enterTimer.current = setTimeout(() => setPopoverOpen(true), 150)
  }

  function handleLeave() {
    enterTimer.current && clearTimeout(enterTimer.current)
    leaveTimer.current = setTimeout(() => setPopoverOpen(false), 200)
  }

  const acceptedEditors = moment.members.filter(
    (m) => m.userId && m.userId !== moment.ownerId && m.role === 'editor' && m.status === 'accepted'
  )
  const acceptedReaders = moment.members.filter(
    (m) => m.userId && m.role === 'reader' && m.status === 'accepted'
  )

  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-3 border-b border-rw-border-subtle flex items-center justify-between gap-4">

      {/* Avatar stack + hover popover */}
      <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer min-h-11"
          onClick={() => setPopoverOpen((v) => !v)}
          aria-label="View members"
        >
          <div className="flex -space-x-2">
            {shownMembers.map((m) => {
              const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()
              return (
                <Avatar key={m.userId} className="size-7 border-2 border-rw-bg">
                  <AvatarImage src={m.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              )
            })}
            {overflow > 0 && (
              <div className="flex size-7 items-center justify-center rounded-full border-2 border-rw-bg bg-rw-surface-raised text-[10px] font-medium text-rw-text-muted">
                +{overflow}
              </div>
            )}
          </div>
          <span className="text-sm text-rw-text-muted">
            {allMembers.length} {allMembers.length === 1 ? 'member' : 'members'}
          </span>
        </button>

        {/* Hover popover */}
        {popoverOpen && (
          <div
            className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-rw-border bg-rw-bg shadow-rw-popover p-3 space-y-2"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <PopoverRow
              firstName={moment.ownerFirstName}
              lastName={moment.ownerLastName}
              photoUrl={moment.ownerPhotoUrl}
              role="owner"
            />
            {acceptedEditors.map((m) => (
              <PopoverRow
                key={m.userId}
                firstName={m.firstName}
                lastName={m.lastName}
                photoUrl={m.photoUrl}
                role="editor"
              />
            ))}
            {acceptedReaders.map((m) => (
              <PopoverRow
                key={m.userId}
                firstName={m.firstName}
                lastName={m.lastName}
                photoUrl={m.photoUrl}
                role="reader"
              />
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {myStatus === 'accepted' && (
        <div className="flex items-center gap-2 shrink-0 [&>*]:min-h-11 [&>*]:md:min-h-0">
          {canEdit && (
            <>
              <CoverPhotoSection
                momentId={moment.id}
                currentUrl={moment.coverPhotoUrl}
                currentStoragePath={moment.coverPhotoStoragePath}
                canEdit={true}
              />
              <InviteDialog momentId={moment.id} myRole={myRole} />
            </>
          )}
          <Link
            href={`/moments/${moment.id}/members`}
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
            aria-label="Manage members"
          >
            <Settings className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Popover row ──────────────────────────────────────────────────────────────

function PopoverRow({
  firstName,
  lastName,
  photoUrl,
  role,
}: {
  firstName: string
  lastName: string
  photoUrl: string | null
  role: 'owner' | 'editor' | 'reader'
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={photoUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm truncate flex-1">{firstName} {lastName}</span>
      <span className="flex items-center gap-0.5 text-xs text-rw-text-muted shrink-0">
        {role === 'owner' && <><Crown className="size-3" /> Owner</>}
        {role === 'editor' && <><PenTool className="size-3" /> Editor</>}
        {role === 'reader' && <><Eye className="size-3" /> Reader</>}
      </span>
    </div>
  )
}

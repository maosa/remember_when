'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, MoreHorizontal, Archive, ArchiveRestore, Pencil, Crown, PenTool, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { archiveMoment, unarchiveMoment, type MomentSummary } from '../actions'
import { EditMomentModal } from '@/app/(app)/_components/edit-moment-modal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(year: number | null, month: number | null, day: number | null): string | null {
  if (!year) return null
  if (!month) return String(year)
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
  if (!day) return `${monthName} ${year}`
  return `${monthName} ${day}, ${year}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentSummary
  currentUserId: string
}

export function MomentCard({ moment, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const date = formatDate(moment.dateYear, moment.dateMonth, moment.dateDay)
  const isPendingInvite = moment.myStatus === 'pending'
  const canEdit = moment.myStatus === 'accepted' && (moment.myRole === 'owner' || moment.myRole === 'editor')

  function toggleArchive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      if (moment.isArchived) {
        await unarchiveMoment(moment.id)
      } else {
        await archiveMoment(moment.id)
      }
    })
  }

  // Build ordered member list for avatar stack: owner first, then accepted non-owner members
  const acceptedNonOwner = moment.members.filter(
    (m) => m.userId !== moment.ownerId && m.status === 'accepted'
  )
  const allMembers = [
    { userId: moment.ownerId, firstName: moment.ownerFirstName, lastName: moment.ownerLastName, photoUrl: moment.ownerPhotoUrl },
    ...acceptedNonOwner.map((m) => ({ userId: m.userId, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl })),
  ]
  const MAX_AVATARS = 5
  const showOverflow = allMembers.length > MAX_AVATARS
  const shownAvatars = showOverflow ? allMembers.slice(0, 4) : allMembers
  const overflowCount = allMembers.length - 4

  const hasBodyContent = date || moment.location || moment.tags.length > 0 || moment.myStatus === 'accepted'

  return (
    <div className="relative group">
      <Link
        href={`/moments/${moment.id}`}
        className={cn(
          'block rounded-rw-card border border-rw-border-subtle bg-rw-surface shadow-rw-card transition-all hover:shadow-[0_4px_20px_rgba(44,42,37,0.13)] hover:-translate-y-px overflow-hidden',
          isPendingInvite && 'ring-2 ring-rw-accent/30'
        )}
      >
        {/* ── Cover area ─────────────────────────────────────────── */}
        <div className="relative h-36 overflow-hidden">
          {moment.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={moment.coverPhotoUrl}
              alt={moment.name}
              className="size-full object-cover"
            />
          ) : (
            // Warm sage gradient placeholder
            <div className="size-full bg-gradient-to-br from-rw-accent-subtle via-rw-surface-raised to-rw-surface" />
          )}

          {/* Gradient overlay — ensures name is always legible */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(44,42,37,0.15) 45%, rgba(44,42,37,0.72) 100%)' }}
          />

          {/* Invited badge */}
          {isPendingInvite && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5">Invited</Badge>
            </div>
          )}

          {/* Moment name — overlaid at cover bottom per design system */}
          <p
            className="absolute bottom-3 left-3.5 right-10 font-sans font-semibold text-[14px] leading-snug text-white line-clamp-2"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}
          >
            {moment.name}
          </p>
        </div>

        {/* ── Card body ────────────────────────────────────────────── */}
        {hasBodyContent && (
          <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-1.5">

            {/* Row 1: Date */}
            {date && (
              <div className="flex items-center gap-1 text-[12px] text-rw-text-muted">
                <Calendar className="size-3 shrink-0" />
                {date}
              </div>
            )}

            {/* Row 2: Location */}
            {moment.location && (
              <div className="flex items-center gap-1 text-[12px] text-rw-text-muted">
                <MapPin className="size-3 shrink-0" />
                {moment.location}
              </div>
            )}

            {/* Row 3: Tags */}
            {moment.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {moment.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-rw-accent-subtle text-rw-accent px-2 py-0.5 text-[10px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
                {moment.tags.length > 5 && (
                  <span className="inline-flex items-center rounded-full bg-rw-accent-subtle text-rw-accent px-2 py-0.5 text-[10px] font-medium">
                    +{moment.tags.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Row 4: Role badge (left) + Avatar stack (right) */}
            {moment.myStatus === 'accepted' && (
              <div className={cn('flex items-center justify-between gap-2', (date || moment.location || moment.tags.length > 0) && 'mt-0.5 pt-1.5 border-t border-rw-border-subtle/60')}>
                {/* Role badge */}
                <span className="inline-flex items-center gap-1 text-[11px] text-rw-text-muted">
                  {moment.myRole === 'owner'  && <><Crown   className="size-3" /> Owner</>}
                  {moment.myRole === 'editor' && <><PenTool className="size-3" /> Editor</>}
                  {moment.myRole === 'reader' && <><Eye     className="size-3" /> Reader</>}
                </span>

                {/* Avatar stack */}
                <div className="flex -space-x-1.5">
                  {shownAvatars.map((m) => {
                    const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()
                    return (
                      <Avatar key={m.userId} className="size-6 border-2 border-rw-surface">
                        <AvatarImage src={m.photoUrl ?? undefined} />
                        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                      </Avatar>
                    )
                  })}
                  {showOverflow && (
                    <div className="size-6 flex items-center justify-center rounded-full border-2 border-rw-surface bg-rw-surface-raised text-[9px] font-medium text-rw-text-muted">
                      +{overflowCount}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </Link>

      {/* ── Action menu — hover-only, top-right of cover ─────────── */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="flex size-7 items-center justify-center rounded-md bg-rw-bg/80 backdrop-blur-sm text-rw-text-primary shadow-sm hover:bg-rw-bg transition-colors"
                aria-label="Moment options"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </MenuTrigger>
          <MenuContent align="end">
            {canEdit && (
              <MenuItem
                onClick={(e) => { e.preventDefault(); setEditOpen(true) }}
                className="gap-2"
              >
                <Pencil className="size-3.5" /> Edit
              </MenuItem>
            )}
            <MenuItem
              disabled={isPending}
              onClick={toggleArchive}
              className="gap-2"
            >
              {moment.isArchived ? (
                <><ArchiveRestore className="size-3.5" /> Unarchive</>
              ) : (
                <><Archive className="size-3.5" /> Archive</>
              )}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {canEdit && (
        <EditMomentModal
          moment={{
            id: moment.id,
            name: moment.name,
            dateYear: moment.dateYear,
            dateMonth: moment.dateMonth,
            dateDay: moment.dateDay,
            location: moment.location,
            tags: moment.tags,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  )
}

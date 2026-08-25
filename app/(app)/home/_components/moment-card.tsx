'use client'

import { memo, useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Calendar, MoreHorizontal, Archive, ArchiveRestore, Pencil, Crown, PenTool, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { archiveMoment, unarchiveMoment, type MomentSummary } from '../actions'
import { MomentTags } from './moment-tags'
import { toast } from 'sonner'

// Fixed height for every moment card so the grid stays uniform regardless of
// content, user, or account. Sized to comfortably fit the fullest card (cover +
// date + location + one line of tags + role/avatar footer).
// Revisit this value if cards are enriched with more elements in the future.
const CARD_HEIGHT = 'h-[17.5rem]'

const EditMomentModal = dynamic(
  () => import('@/app/(app)/_components/edit-moment-modal').then((m) => ({ default: m.EditMomentModal })),
  // Local Suspense boundary: keep the first-open chunk fetch from bubbling up and
  // re-mounting the card grid (which would re-load every cover photo).
  { loading: () => null }
)

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
}

export const MomentCard = memo(function MomentCard({ moment }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  // Only mount the modal after first open to avoid N hidden dialog instances in the grid
  const [editEverOpened, setEditEverOpened] = useState(false)
  const date = formatDate(moment.dateYear, moment.dateMonth, moment.dateDay)
  const isPendingInvite = moment.myStatus === 'pending'
  const canEdit = moment.myStatus === 'accepted' && (moment.myRole === 'owner' || moment.myRole === 'editor')

  function toggleArchive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      if (moment.isArchived) {
        const res = await unarchiveMoment(moment.id)
        if (res.error) toast.error(res.error)
        else toast.success('Moment unarchived')
      } else {
        const res = await archiveMoment(moment.id)
        if (res.error) toast.error(res.error)
        else toast.success('Moment archived')
      }
    })
  }

  // Build ordered member list for avatar stack: owner first, then accepted non-owner members.
  // Memoised so the derived arrays are stable across re-renders caused by local state changes
  // (e.g. opening/closing the edit modal).
  const { allMembers, shownAvatars, showOverflow, overflowCount } = useMemo(() => {
    const acceptedNonOwner = moment.members.filter(
      (m) => m.userId !== moment.ownerId && m.status === 'accepted'
    )
    const allMembers = [
      { userId: moment.ownerId, firstName: moment.ownerFirstName, lastName: moment.ownerLastName, photoUrl: moment.ownerPhotoUrl, role: 'owner' as const },
      ...acceptedNonOwner.map((m) => ({ userId: m.userId, firstName: m.firstName, lastName: m.lastName, photoUrl: m.photoUrl, role: m.role })),
    ]
    const MAX_AVATARS = 5
    const overflow = allMembers.length > MAX_AVATARS
    // When overflowing, reserve one slot for the "+N" chip.
    const shownCount = MAX_AVATARS - 1
    return {
      allMembers,
      shownAvatars: overflow ? allMembers.slice(0, shownCount) : allMembers,
      showOverflow: overflow,
      overflowCount: allMembers.length - shownCount,
    }
  }, [moment.members, moment.ownerId, moment.ownerFirstName, moment.ownerLastName, moment.ownerPhotoUrl])

  return (
    <div className="relative group">
      <Link
        href={`/moments/${moment.id}`}
        className={cn(
          CARD_HEIGHT,
          'flex flex-col rounded-rw-card border border-rw-border-subtle bg-rw-surface shadow-rw-card transition-all hover:shadow-[0_4px_20px_rgba(44,42,37,0.13)] hover:-translate-y-px overflow-hidden',
          isPendingInvite && 'ring-2 ring-rw-accent/30'
        )}
      >
        {/* ── Cover area ─────────────────────────────────────────── */}
        <div className="relative h-36 shrink-0 overflow-hidden">
          {moment.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={moment.coverPhotoUrl}
              alt={moment.name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
              style={{ objectPosition: `50% ${moment.coverPosition ?? 50}%` }}
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
        {/* Always rendered and flex-1 so every card fills the fixed height uniformly. */}
        <div className="flex-1 min-h-0 overflow-hidden px-3.5 pt-3 pb-3.5 flex flex-col gap-1.5">

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

            {/* Tags — single line, overflow collapses into "+N more".
                The full tags array still powers search (see moments-list filter). */}
            {moment.tags.length > 0 && <MomentTags tags={moment.tags} />}

            {/* Row 6: Role badge (left) + Avatar stack (right) */}
            {moment.myStatus === 'accepted' && (
              <div className={cn('flex items-center justify-between gap-2 mt-auto', (date || moment.location || moment.tags.length > 0) && 'pt-1.5 border-t border-rw-border-subtle/60')}>
                {/* Role badge */}
                <span className="inline-flex items-center gap-1 text-[11px] text-rw-text-muted">
                  {moment.myRole === 'owner'  && <><Crown   className="size-3" /> Owner</>}
                  {moment.myRole === 'editor' && <><PenTool className="size-3" /> Editor</>}
                  {moment.myRole === 'reader' && <><Eye     className="size-3" /> Reader</>}
                </span>

                {/* Avatar stack — hover a badge for the name, "+N" for the full list.
                    Desktop-only by nature (base-ui Tooltip is hover/focus-triggered);
                    portaled so it escapes the card's overflow-hidden clip. */}
                <TooltipProvider>
                  <div className="flex -space-x-1.5">
                    {shownAvatars.map((m) => {
                      const initials = `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()
                      return (
                        <Tooltip key={m.userId}>
                          <TooltipTrigger
                            render={
                              <Avatar className="size-6 border-2 border-rw-surface">
                                <AvatarImage src={m.photoUrl ?? undefined} />
                                <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                              </Avatar>
                            }
                          />
                          <TooltipContent>{`${m.firstName} ${m.lastName}`.trim()}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {showOverflow && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className="size-6 flex items-center justify-center rounded-full border-2 border-rw-surface bg-rw-surface-raised text-[9px] font-medium text-rw-text-muted cursor-default">
                              +{overflowCount}
                            </div>
                          }
                        />
                        <TooltipContent align="end" className="w-56 max-w-[min(16rem,calc(100vw-2rem))] p-2 space-y-1.5 font-normal">
                          {allMembers.map((m) => (
                            <MemberTooltipRow
                              key={m.userId}
                              firstName={m.firstName}
                              lastName={m.lastName}
                              photoUrl={m.photoUrl}
                              role={m.role}
                            />
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}

        </div>
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
                onClick={(e) => { e.preventDefault(); setEditEverOpened(true); setEditOpen(true) }}
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

      {canEdit && editEverOpened && (
        <EditMomentModal
          moment={{
            id: moment.id,
            name: moment.name,
            dateYear: moment.dateYear,
            dateMonth: moment.dateMonth,
            dateDay: moment.dateDay,
            location: moment.location,
            placeKind: moment.placeKind,
            placeCountryCode: moment.placeCountryCode,
            placeLat: moment.placeLat,
            placeLng: moment.placeLng,
            tags: moment.tags,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </div>
  )
})

// ─── Member row for the "+N more" hover list ────────────────────────────────────

function MemberTooltipRow({
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
  const RoleIcon = role === 'owner' ? Crown : role === 'editor' ? PenTool : Eye
  const roleLabel = role === 'owner' ? 'Owner' : role === 'editor' ? 'Editor' : 'Reader'
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={photoUrl ?? undefined} />
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="flex-1 truncate text-[13px] font-medium text-rw-text-primary">
        {firstName} {lastName}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-rw-text-muted">
        <RoleIcon className="size-3" /> {roleLabel}
      </span>
    </div>
  )
}

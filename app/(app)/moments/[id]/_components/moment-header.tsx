'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MapPin, Calendar, CheckCircle2, XCircle, MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { cn } from '@/lib/utils'
import { acceptMomentInvite, declineMomentInvite, type MomentDetail } from '../actions'
import { EditMomentModal } from '@/app/(app)/_components/edit-moment-modal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(year: number | null, month: number | null, day: number | null): string | null {
  if (!year) return null
  if (!month) return String(year)
  const m = MONTHS_SHORT[month - 1]
  if (!day) return `${m} ${year}`
  return `${m} ${day}, ${year}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
}

export function MomentHeader({ moment, myRole, myStatus }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const canEdit = myStatus === 'accepted' && (myRole === 'owner' || myRole === 'editor')

  const date = formatDate(moment.dateYear, moment.dateMonth, moment.dateDay)
  const isPendingInvite = myStatus === 'pending'

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' } // 56px = desktop nav height
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  function handleAccept() {
    setInviteError(null)
    startTransition(async () => {
      const res = await acceptMomentInvite(moment.id)
      if (res.error) setInviteError(res.error)
    })
  }

  function handleDecline() {
    setInviteError(null)
    startTransition(async () => {
      const res = await declineMomentInvite(moment.id)
      if (res.error) setInviteError(res.error)
    })
  }

  return (
    <>
      {/* ── Collapsed sticky bar ──────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-x-0 z-40 h-12 border-b bg-background/95 backdrop-blur-sm transition-all duration-200 ease-in-out',
          'top-0 md:top-14',
          collapsed
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="mx-auto max-w-3xl px-4 h-full flex items-center gap-2">
          <h1 className="font-semibold text-base truncate flex-1">{moment.name}</h1>
          {canEdit && (
            <Menu>
              <MenuTrigger
                render={
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Moment options"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem onClick={() => setEditOpen(true)} className="gap-2">
                  <Pencil className="size-3.5" /> Edit moment
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
      </div>

      {/* ── Full expanded header ───────────────────────────────── */}
      <div className="relative">
        {/* Cover photo */}
        {moment.coverPhotoUrl ? (
          <div className="relative h-52 sm:h-72 overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.coverPhotoUrl}
              alt={moment.name}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent" />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-br from-muted to-muted/60" />
        )}

        {/* Moment info */}
        <div
          className={cn(
            'px-4 pb-3',
            moment.coverPhotoUrl
              ? 'relative -mt-28 pt-0'
              : 'pt-6'
          )}
        >
          <div className="mx-auto max-w-3xl space-y-3">
            {/* Name + edit menu */}
            <div className="flex items-start gap-2">
              <h1
                className={cn(
                  'text-2xl sm:text-3xl font-bold leading-tight flex-1',
                  moment.coverPhotoUrl && 'text-white drop-shadow'
                )}
              >
                {moment.name}
              </h1>
              {canEdit && (
                <Menu>
                  <MenuTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          'mt-1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
                          moment.coverPhotoUrl
                            ? 'text-white/70 hover:text-white hover:bg-white/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        aria-label="Moment options"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </MenuTrigger>
                  <MenuContent align="end">
                    <MenuItem onClick={() => setEditOpen(true)} className="gap-2">
                      <Pencil className="size-3.5" /> Edit moment
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </div>

            {/* Meta */}
            <div className={cn(
              'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm',
              moment.coverPhotoUrl ? 'text-white/90 drop-shadow' : 'text-muted-foreground'
            )}>
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0" />
                  {date}
                </span>
              )}
              {moment.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {moment.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sentinel — when this scrolls out of view the collapsed bar appears */}
      <div ref={sentinelRef} className="h-px" />

      {/* Edit moment modal */}
      {canEdit && (
        <EditMomentModal
          moment={{
            id: moment.id,
            name: moment.name,
            dateYear: moment.dateYear,
            dateMonth: moment.dateMonth,
            dateDay: moment.dateDay,
            location: moment.location,
            tags: moment.tags.map((t) => t.tag),
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {/* ── Pending invite banner ──────────────────────────────── */}
      {isPendingInvite && (
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="space-y-1">
              <p className="font-medium text-sm">You've been invited to this moment</p>
              <p className="text-sm text-muted-foreground">
                Invited by {moment.ownerFirstName} {moment.ownerLastName}
              </p>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={handleAccept}>
                <CheckCircle2 className="size-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={handleDecline}>
                <XCircle className="size-3.5" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

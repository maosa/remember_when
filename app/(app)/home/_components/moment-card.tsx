'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, MoreHorizontal, Archive, ArchiveRestore, Pencil, Crown, PenTool, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

  const hasBodyContent = date || moment.location || moment.myStatus === 'accepted' || moment.tags.length > 0

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
        <div className="relative aspect-[16/9] overflow-hidden">
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

        {/* ── Card body — meta only (name lives in cover) ──────── */}
        {hasBodyContent && (
          <div className="p-3.5 space-y-1.5">
            {/* Date / location + role badge */}
            {(date || moment.location || moment.myStatus === 'accepted') && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-rw-text-muted min-w-0">
                  {date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 shrink-0" />
                      {date}
                    </span>
                  )}
                  {moment.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="size-3 shrink-0" />
                      {moment.location}
                    </span>
                  )}
                </div>
                {moment.myStatus === 'accepted' && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rw-text-muted shrink-0">
                    {moment.myRole === 'owner'  && <><Crown   className="size-3" /> Owner</>}
                    {moment.myRole === 'editor' && <><PenTool className="size-3" /> Editor</>}
                    {moment.myRole === 'reader' && <><Eye     className="size-3" /> Reader</>}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            {moment.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {moment.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
                {moment.tags.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{moment.tags.length - 4}
                  </Badge>
                )}
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

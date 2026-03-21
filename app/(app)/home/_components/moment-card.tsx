'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MapPin, MoreHorizontal, Archive, ArchiveRestore, Pencil, Crown, PenTool, Eye } from 'lucide-react'
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

  return (
    <div className="relative group">
      <Link
        href={`/moments/${moment.id}`}
        className={cn(
          'block rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md overflow-hidden',
          isPendingInvite && 'ring-2 ring-primary/30'
        )}
      >
        {/* Cover photo */}
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {moment.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={moment.coverPhotoUrl}
              alt={moment.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-3xl font-semibold text-muted-foreground/30 select-none">
                {moment.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
          {isPendingInvite && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="text-[10px] px-1.5 py-0.5">Invited</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Name + role */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-w-0">{moment.name}</h3>
            {/* Role badge — only shown for accepted members */}
            {moment.myStatus === 'accepted' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                {moment.myRole === 'owner'  && <><Crown   className="size-3" /> Owner</>}
                {moment.myRole === 'editor' && <><PenTool className="size-3" /> Editor</>}
                {moment.myRole === 'reader' && <><Eye     className="size-3" /> Reader</>}
              </span>
            )}
          </div>

          {/* Date / location */}
          {(date || moment.location) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {date && <span>{date}</span>}
              {moment.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="size-3 shrink-0" />
                  {moment.location}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {moment.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {moment.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="muted" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {moment.tags.length > 4 && (
                <Badge variant="muted" className="text-[10px] px-1.5 py-0">
                  +{moment.tags.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Action menu — positioned over the card */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Menu>
          <MenuTrigger
            render={
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="flex size-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm text-foreground shadow-sm hover:bg-background transition-colors"
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

      {/* Edit modal — controlled externally so it can be opened from the menu */}
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

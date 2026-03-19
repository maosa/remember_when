'use client'

import { useState, useMemo } from 'react'
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Menu,
  MenuContent,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MomentCard } from './moment-card'
import { CreateMomentModal } from './create-moment-modal'
import { type MomentSummary } from '../actions'

type SortMode = 'newest' | 'oldest' | 'split'

interface Props {
  moments: MomentSummary[]
  currentUserId: string
  firstName: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function momentDate(m: MomentSummary): Date {
  if (m.dateYear) {
    return new Date(m.dateYear, (m.dateMonth ?? 1) - 1, m.dateDay ?? 1)
  }
  return new Date(m.createdAt)
}

function sortMoments(moments: MomentSummary[], mode: SortMode): MomentSummary[] {
  if (mode === 'newest') return [...moments].sort((a, b) => +momentDate(b) - +momentDate(a))
  if (mode === 'oldest') return [...moments].sort((a, b) => +momentDate(a) - +momentDate(b))
  return moments // split mode handled separately
}

function filterMoments(moments: MomentSummary[], query: string): MomentSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return moments
  return moments.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.location?.toLowerCase().includes(q) ?? false) ||
      m.tags.some((t) => t.toLowerCase().includes(q)) ||
      m.members.some(
        (mb) =>
          mb.firstName.toLowerCase().includes(q) ||
          mb.lastName.toLowerCase().includes(q)
      )
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MomentsList({ moments, currentUserId, firstName }: Props) {
  const [sort, setSort] = useState<SortMode>('newest')
  const [search, setSearch] = useState('')

  const active = moments.filter((m) => !m.isArchived)
  const archived = moments.filter((m) => m.isArchived)

  const filteredActive = useMemo(() => filterMoments(active, search), [active, search])
  const filteredArchived = useMemo(() => filterMoments(archived, search), [archived, search])

  const sortedActive = useMemo(() => sortMoments(filteredActive, sort), [filteredActive, sort])
  const sortedArchived = useMemo(() => sortMoments(filteredArchived, sort), [filteredArchived, sort])

  const sortLabel: Record<SortMode, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    split: 'Split view',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Hey, {firstName} 👋
        </h1>
        <CreateMomentModal />
      </div>

      {/* Search + sort row */}
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Search moments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Menu>
          <MenuTrigger
            render={
              <Button variant="outline" className="shrink-0 w-36" />
            }
          >
            <ArrowUpDown className="size-3.5" />
            <span>{sortLabel[sort]}</span>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>Sort</MenuLabel>
            <MenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <MenuRadioItem value="newest">Newest first</MenuRadioItem>
              <MenuRadioItem value="oldest">Oldest first</MenuRadioItem>
              <MenuSeparator />
              <MenuRadioItem value="split">Split view</MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="moments">
        <TabsList>
          <TabsTrigger value="moments">
            Moments
            {active.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs font-medium">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            {archived.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-xs font-medium">
                {archived.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Active moments ───────────────────────────── */}
        <TabsContent value="moments" className="mt-4">
          <MomentsGrid
            moments={sortedActive}
            currentUserId={currentUserId}
            sort={sort}
            emptyMessage="No moments yet — create your first one!"
          />
        </TabsContent>

        {/* ── Archived moments ─────────────────────────── */}
        <TabsContent value="archived" className="mt-4">
          <MomentsGrid
            moments={sortedArchived}
            currentUserId={currentUserId}
            sort={sort}
            emptyMessage="Nothing archived yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Grid (handles split-view logic) ─────────────────────────────────────────

function MomentsGrid({
  moments,
  currentUserId,
  sort,
  emptyMessage,
}: {
  moments: MomentSummary[]
  currentUserId: string
  sort: SortMode
  emptyMessage: string
}) {
  if (moments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    )
  }

  if (sort === 'split') {
    const yours = moments.filter((m) => m.ownerId === currentUserId)
    const shared = moments.filter((m) => m.ownerId !== currentUserId)
    return (
      <div className="space-y-8">
        {yours.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created by you</h2>
            <Grid moments={yours} currentUserId={currentUserId} />
          </section>
        )}
        {shared.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared with you</h2>
            <Grid moments={shared} currentUserId={currentUserId} />
          </section>
        )}
      </div>
    )
  }

  return <Grid moments={moments} currentUserId={currentUserId} />
}

function Grid({ moments, currentUserId }: { moments: MomentSummary[]; currentUserId: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {moments.map((m) => (
        <MomentCard key={m.id} moment={m} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

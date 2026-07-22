'use client'

import { useState, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { ArrowUpDown, BookOpen, Plus, Map as MapIcon, LayoutGrid } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/button-variants'
import { EmptyState } from '@/components/ui/empty-state'
import { MomentCard } from './moment-card'
import { type MomentSummary } from '../actions'

const CreateMomentModal = dynamic(
  () => import('./create-moment-modal').then((m) => ({ default: m.CreateMomentModal })),
  // Give the lazy chunk its own Suspense boundary so the first-open chunk fetch
  // doesn't bubble suspension up to the route boundary and re-mount the whole page.
  { loading: () => null }
)

// The map bundles d3 + a world TopoJSON (~100KB); load it only when opened.
const MomentsMap = dynamic(
  () => import('./moments-map').then((m) => ({ default: m.MomentsMap })),
  { loading: () => <div className="py-16 text-center text-sm text-rw-text-muted">Loading map…</div> }
)

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
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [createEverOpened, setCreateEverOpened] = useState(false)

  const active = useMemo(() => moments.filter((m) => !m.isArchived), [moments])
  const archived = useMemo(() => moments.filter((m) => m.isArchived), [moments])

  const filteredActive = useMemo(() => filterMoments(active, search), [active, search])
  const filteredArchived = useMemo(() => filterMoments(archived, search), [archived, search])

  const sortedActive = useMemo(() => sortMoments(filteredActive, sort), [filteredActive, sort])
  const sortedArchived = useMemo(() => sortMoments(filteredArchived, sort), [filteredArchived, sort])

  const sortLabel: Record<SortMode, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    split: 'Split view',
  }

  // Grid ↔ map toggle. Rendered in two spots by breakpoint (see below): the
  // search row on desktop / in map view, and the tabs row on mobile in grid view.
  const viewToggle = (extraClass = '') => (
    <button
      type="button"
      onClick={() => setView((v) => (v === 'grid' ? 'map' : 'grid'))}
      aria-pressed={view === 'map'}
      className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 h-10 gap-1.5 px-2.5 sm:w-36 sm:px-3', extraClass)}
      title={view === 'grid' ? 'Map view' : 'Grid view'}
    >
      {view === 'grid' ? <MapIcon className="size-4" /> : <LayoutGrid className="size-4" />}
      <span className="hidden sm:inline">{view === 'grid' ? 'Map' : 'Grid'}</span>
    </button>
  )

  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-8 space-y-6">

      {/* Header — greeting + new moment CTA */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold text-rw-text-primary leading-tight">
          Hey, {firstName}.
        </h1>
        <Button
          className="w-36 h-10"
          onClick={() => { setCreateEverOpened(true); setCreateOpen(true) }}
        >
          <Plus className="size-4" />
          New moment
        </Button>
      </div>

      {createEverOpened && (
        <CreateMomentModal open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {/* Search + controls row. In map view the sort menu is hidden (it doesn't
          apply); search still filters the map's dots. The view toggle is always here. */}
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder={view === 'map' ? 'Search the map…' : 'Search moments…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        {view === 'grid' && (
          <Menu>
            <MenuTrigger
              render={
                <button type="button" className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 w-36 h-10')} />
              }
            >
              <ArrowUpDown className="size-3.5" />
              <span>{sortLabel[sort]}</span>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                <MenuRadioItem value="newest">Newest first</MenuRadioItem>
                <MenuRadioItem value="oldest">Oldest first</MenuRadioItem>
                <MenuSeparator />
                <MenuRadioItem value="split">Split view</MenuRadioItem>
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
        )}
        {/* Toggle lives here on desktop (both views) and on mobile in map view
            (map view has no tabs row). On mobile in grid view it moves to the
            tabs row instead — see below. */}
        {viewToggle(view === 'grid' ? 'hidden sm:inline-flex' : '')}
      </div>

      {/* Tabs — underline style */}
      {/* Badge dimensions are derived from the larger of the two counts so both
          badges are always identical in size regardless of digit count. */}
      {(() => {
        const maxCount = Math.max(active.length, archived.length)
        const digits = String(maxCount).length
        const badgeSize = digits >= 3 ? 'h-[18px] w-[26px]' : digits === 2 ? 'h-[18px] w-[22px]' : 'h-[18px] w-[18px]'
        const badgeCls = `ml-1.5 inline-flex items-center justify-center rounded-full tabular-nums leading-none text-[11px] font-medium bg-rw-surface-raised text-rw-text-muted group-data-[active]:bg-rw-accent/15 group-data-[active]:text-rw-accent ${badgeSize}`
        // Map view — non-archived moments only; sort + tabs don't apply, so
        // they're hidden. Search filters which dots appear.
        if (view === 'map') {
          return <MomentsMap moments={filteredActive} />
        }

        return (
          <Tabs defaultValue="moments">
            <div className="flex items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="moments">
                  Moments
                  {active.length > 0 && (
                    <span className={badgeCls}>{active.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived
                  {archived.length > 0 && (
                    <span className={badgeCls}>{archived.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
              {/* Mobile-only: the map toggle sits beside the tabs (matches round 1). */}
              {viewToggle('sm:hidden')}
            </div>

            {/* ── Active moments ───────────────────────────── */}
            <TabsContent value="moments" className="mt-5">
              <MomentsGrid
                moments={sortedActive}
                currentUserId={currentUserId}
                sort={sort}
                emptyTitle="No moments yet"
                emptyDescription="Create your first moment and start capturing memories together."
              />
            </TabsContent>

            {/* ── Archived moments ─────────────────────────── */}
            <TabsContent value="archived" className="mt-5">
              <MomentsGrid
                moments={sortedArchived}
                currentUserId={currentUserId}
                sort={sort}
                emptyTitle="Nothing archived"
                emptyDescription="Moments you archive will appear here."
              />
            </TabsContent>
          </Tabs>
        )
      })()}
    </div>
  )
}

// ─── Grid (handles split-view logic) ─────────────────────────────────────────

const MomentsGrid = memo(function MomentsGrid({
  moments,
  currentUserId,
  sort,
  emptyTitle,
  emptyDescription,
}: {
  moments: MomentSummary[]
  currentUserId: string
  sort: SortMode
  emptyTitle: string
  emptyDescription: string
}) {
  // Hoist split-view filters unconditionally so hooks rules are respected
  const yours = useMemo(() => moments.filter((m) => m.ownerId === currentUserId), [moments, currentUserId])
  const shared = useMemo(() => moments.filter((m) => m.ownerId !== currentUserId), [moments, currentUserId])

  if (moments.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="size-11" />}
        title={emptyTitle}
        description={emptyDescription}
        className="py-16"
      />
    )
  }

  if (sort === 'split') {
    return (
      <div className="space-y-8">
        {yours.length > 0 && (
          <section className="space-y-3">
            <p className="font-sans text-[11px] font-semibold text-rw-text-placeholder uppercase tracking-[0.1em]">
              Created by you
            </p>
            <Grid moments={yours} />
          </section>
        )}
        {shared.length > 0 && (
          <section className="space-y-3">
            <p className="font-sans text-[11px] font-semibold text-rw-text-placeholder uppercase tracking-[0.1em]">
              Shared with you
            </p>
            <Grid moments={shared} />
          </section>
        )}
      </div>
    )
  }

  return <Grid moments={moments} />
})

const Grid = memo(function Grid({ moments }: { moments: MomentSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {moments.map((m) => (
        <MomentCard key={m.id} moment={m} />
      ))}
    </div>
  )
})

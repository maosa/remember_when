'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, BookOpen } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/lib/button-variants'
import { EmptyState } from '@/components/ui/empty-state'
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
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-8 space-y-6">

      {/* Header — greeting + new moment CTA */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold text-rw-text-primary leading-tight">
          Hey, {firstName}.
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
      </div>

      {/* Tabs — underline style */}
      <Tabs defaultValue="moments">
        <TabsList>
          <TabsTrigger value="moments">
            Moments
            {active.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-rw-surface-raised px-1.5 py-0.5 text-[11px] font-medium text-rw-text-muted group-data-[selected]:bg-rw-accent/15 group-data-[selected]:text-rw-accent">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            {archived.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-rw-surface-raised px-1.5 py-0.5 text-[11px] font-medium text-rw-text-muted group-data-[selected]:bg-rw-accent/15 group-data-[selected]:text-rw-accent">
                {archived.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

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
    </div>
  )
}

// ─── Grid (handles split-view logic) ─────────────────────────────────────────

function MomentsGrid({
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
    const yours = moments.filter((m) => m.ownerId === currentUserId)
    const shared = moments.filter((m) => m.ownerId !== currentUserId)
    return (
      <div className="space-y-8">
        {yours.length > 0 && (
          <section className="space-y-3">
            <p className="font-sans text-[11px] font-semibold text-rw-text-placeholder uppercase tracking-[0.1em]">
              Created by you
            </p>
            <Grid moments={yours} currentUserId={currentUserId} />
          </section>
        )}
        {shared.length > 0 && (
          <section className="space-y-3">
            <p className="font-sans text-[11px] font-semibold text-rw-text-placeholder uppercase tracking-[0.1em]">
              Shared with you
            </p>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {moments.map((m) => (
        <MomentCard key={m.id} moment={m} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

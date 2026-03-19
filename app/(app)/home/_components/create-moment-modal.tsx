'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Plus, X, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createMoment, searchUsersToInvite, type Invitee } from '../actions'

// ─── Date mode ───────────────────────────────────────────────────────────────

type DateMode = 'year' | 'month-year' | 'full'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Invite list item ─────────────────────────────────────────────────────────

type InviteeDisplay = Invitee & {
  label: string
  photoUrl?: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateMomentModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('year')
  const [dateYear, setDateYear] = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateDay, setDateDay] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [invitees, setInvitees] = useState<InviteeDisplay[]>([])

  function reset() {
    setName('')
    setDateMode('year')
    setDateYear('')
    setDateMonth('')
    setDateDay('')
    setLocation('')
    setTags([])
    setTagInput('')
    setInvitees([])
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    setOpen(val)
  }

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t || t.length > 20 || tags.includes(t)) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '') {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function addInvitee(item: InviteeDisplay) {
    if (invitees.some((i) => i.value === item.value)) return
    setInvitees((prev) => [...prev, item])
  }

  function removeInvitee(value: string) {
    setInvitees((prev) => prev.filter((i) => i.value !== value))
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createMoment({
        name,
        dateYear: dateYear ? parseInt(dateYear) : null,
        dateMonth: (dateMode === 'month-year' || dateMode === 'full') && dateMonth
          ? parseInt(dateMonth)
          : null,
        dateDay: dateMode === 'full' && dateDay ? parseInt(dateDay) : null,
        location,
        tags,
        invitees: invitees.map(({ type, value }) => ({ type, value })),
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
    })
  }

  const currentYear = new Date().getFullYear()
  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        New moment
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New moment</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="moment-name"
              placeholder="e.g. Summer in Barcelona"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            {/* Mode selector */}
            <div className="inline-flex rounded-lg border bg-muted p-0.5 gap-0.5 text-xs">
              {(['year', 'month-year', 'full'] as DateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDateMode(mode)}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    dateMode === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'year' ? 'Year' : mode === 'month-year' ? 'Month + Year' : 'Full date'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day (full only) */}
              {dateMode === 'full' && (
                <Input
                  type="number"
                  placeholder="Day"
                  min={1}
                  max={31}
                  value={dateDay}
                  onChange={(e) => setDateDay(e.target.value)}
                  className="w-20"
                />
              )}
              {/* Month (month-year + full) */}
              {(dateMode === 'month-year' || dateMode === 'full') && (
                <select
                  value={dateMonth}
                  onChange={(e) => setDateMonth(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              )}
              {/* Year */}
              <Input
                type="number"
                placeholder="Year"
                min={1900}
                max={currentYear + 1}
                value={dateYear}
                onChange={(e) => setDateYear(e.target.value)}
                className={dateMode === 'year' ? 'w-28' : 'w-24'}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-location">Location <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Input
              id="moment-location"
              placeholder="e.g. Barcelona, Spain"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* People */}
          <div className="space-y-1.5">
            <Label>People <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <PeopleInviteInput
              invitees={invitees}
              onAdd={addInvitee}
              onRemove={removeInvitee}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags <span className="text-muted-foreground text-xs font-normal">(optional · max 20 chars)</span></Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 min-h-9 cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.slice(0, 20))}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Creating…' : 'Create moment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── People invite input ──────────────────────────────────────────────────────

function PeopleInviteInput({
  invitees,
  onAdd,
  onRemove,
}: {
  invitees: InviteeDisplay[]
  onAdd: (item: InviteeDisplay) => void
  onRemove: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }> | null>(null)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
  const excludeIds = invitees.filter((i) => i.type === 'userId').map((i) => i.value)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }

    if (isEmail(q)) {
      setResults(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await searchUsersToInvite(q, excludeIds)
      setSearching(false)
      setResults(res.users ?? [])
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = query.trim()
      if (isEmail(q)) {
        onAdd({ type: 'email', value: q, label: q })
        setQuery('')
        setResults(null)
      }
    }
  }

  function selectUser(u: { id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }) {
    onAdd({ type: 'userId', value: u.id, label: `${u.firstName} ${u.lastName}`, photoUrl: u.photoUrl })
    setQuery('')
    setResults(null)
  }

  return (
    <div className="space-y-2">
      {/* Added people chips */}
      {invitees.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {invitees.map((i) => (
            <span key={i.value} className="inline-flex items-center gap-1.5 rounded-full border bg-secondary pl-1.5 pr-2 py-0.5 text-xs font-medium">
              {i.type === 'userId' && (
                <Avatar className="size-4">
                  <AvatarImage src={i.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">{i.label[0]}</AvatarFallback>
                </Avatar>
              )}
              {i.label}
              <button type="button" onClick={() => onRemove(i.value)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by name, username, or enter email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-8"
          autoComplete="off"
        />
      </div>

      {/* Email add hint */}
      {isEmail(query.trim()) && !invitees.some((i) => i.value === query.trim()) && (
        <button
          type="button"
          onClick={() => {
            onAdd({ type: 'email', value: query.trim(), label: query.trim() })
            setQuery('')
          }}
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
        >
          <Plus className="size-3.5 text-muted-foreground" />
          Invite <span className="font-medium">{query.trim()}</span> by email
        </button>
      )}

      {/* Search results */}
      {searching && <p className="text-xs text-muted-foreground px-1">Searching…</p>}
      {results !== null && !searching && (
        results.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No users found.</p>
        ) : (
          <ul className="space-y-0.5">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
                  className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 hover:bg-accent transition-colors text-left"
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={u.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <UserRound className="size-3.5 text-muted-foreground ml-auto shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

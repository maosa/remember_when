'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Plus, X, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 3000 - 1900 + 1 }, (_, i) => 1900 + i)

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

/** Returns the number of days in a month. When year is omitted, Feb returns 28 (safe default). */
function daysInMonth(month: number, year?: number): number {
  if (month === 2) {
    if (year === undefined) return 28
    return isLeapYear(year) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// ─── Invite list item ─────────────────────────────────────────────────────────

type InviteeDisplay = {
  type: 'userId' | 'email'
  value: string
  role: 'editor' | 'reader'
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
  const [dateYear, setDateYear] = useState(String(CURRENT_YEAR))
  const [dateMonth, setDateMonth] = useState('')
  const [dateDay, setDateDay] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [invitees, setInvitees] = useState<InviteeDisplay[]>([])

  function reset() {
    setName('')
    setDateMode('year')
    setDateYear(String(CURRENT_YEAR))
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
    setInvitees((prev) => [...prev, { ...item, role: item.role ?? 'editor' }])
  }

  function removeInvitee(value: string) {
    setInvitees((prev) => prev.filter((i) => i.value !== value))
  }

  function updateInviteeRole(value: string, role: 'editor' | 'reader') {
    setInvitees((prev) => prev.map((i) => i.value === value ? { ...i, role } : i))
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
        invitees: invitees.map(({ type, value, role }) => ({ type, value, role })),
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
    })
  }

  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="w-36 h-10" />}>
        <Plus className="size-4" />
        New moment
      </DialogTrigger>

      <DialogContent className="sm:max-w-[484px] flex flex-col max-h-[90dvh]">
        <DialogHeader className="border-b-0 pb-0">
          <DialogTitle>New moment</DialogTitle>
        </DialogHeader>

        <DialogBody className="pt-5 overflow-y-auto">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-name">Name <span className="text-rw-danger">*</span></Label>
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
            <Label>Date <span className="text-rw-text-muted text-xs font-normal">(optional)</span></Label>
            {/* Mode selector */}
            <div className="inline-flex rounded-lg border border-rw-border-subtle bg-rw-surface-raised p-0.5 gap-0.5 text-xs">
              {(['year', 'month-year', 'full'] as DateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setDateMode(mode)
                    // Clamp stored day when switching into full mode
                    if (mode === 'full' && dateDay && dateMonth) {
                      const max = daysInMonth(parseInt(dateMonth), dateYear ? parseInt(dateYear) : undefined)
                      if (parseInt(dateDay) > max) setDateDay(String(max))
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    dateMode === mode
                      ? 'bg-rw-bg text-rw-text-primary shadow-sm'
                      : 'text-rw-text-muted hover:text-rw-text-primary'
                  )}
                >
                  {mode === 'year' ? 'Year' : mode === 'month-year' ? 'Month + Year' : 'Full date'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day — dropdown 1–N where N = days in selected month/year */}
              {dateMode === 'full' && (
                <Select
                  value={dateDay}
                  onValueChange={(d) => setDateDay(d === null ? '' : d)}
                >
                  <SelectTrigger className="w-20" style={{ height: '2.5rem' }}>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56" alignItemWithTrigger={false}>
                    {Array.from(
                      {
                        length: dateMonth
                          ? daysInMonth(parseInt(dateMonth), dateYear ? parseInt(dateYear) : undefined)
                          : 31,
                      },
                      (_, i) => i + 1
                    ).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Month (month-year + full) */}
              {(dateMode === 'month-year' || dateMode === 'full') && (
                <Select
                  value={dateMonth}
                  onValueChange={(m) => {
                    const actual = m === null ? '' : m
                    setDateMonth(actual)
                    // Clamp day if it's now beyond the new month's max
                    if (dateMode === 'full' && dateDay && actual) {
                      const max = daysInMonth(parseInt(actual), dateYear ? parseInt(dateYear) : undefined)
                      if (parseInt(dateDay) > max) setDateDay(String(max))
                    }
                  }}
                >
                  <SelectTrigger className="flex-1" style={{ height: '2.5rem' }}>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56" alignItemWithTrigger={false}>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Year — opens below trigger; scrolls selected year to centre of list on open */}
              <Select
                value={dateYear}
                onValueChange={(y) => {
                  const actual = y === null ? '' : y
                  setDateYear(actual)
                  // Clamp day if Feb 29 becomes invalid (non-leap year)
                  if (dateMode === 'full' && dateDay && dateMonth && actual) {
                    const max = daysInMonth(parseInt(dateMonth), parseInt(actual))
                    if (parseInt(dateDay) > max) setDateDay(String(max))
                  }
                }}
                onOpenChange={(open) => {
                  if (!open) return
                  // Double rAF: wait for portal paint, then scroll the selected item to the
                  // centre of the popup by setting scrollTop directly on the scroll container.
                  // Using scrollIntoView would propagate up the ancestor chain and scroll the
                  // page body, causing visible background jump on every open.
                  requestAnimationFrame(() => requestAnimationFrame(() => {
                    const popup = document.querySelector('[data-slot="select-content"]') as HTMLElement | null
                    const selected = popup?.querySelector('[aria-selected="true"]') as HTMLElement | null
                    if (!popup || !selected) return
                    popup.scrollTop = selected.offsetTop - popup.clientHeight / 2 + selected.offsetHeight / 2
                  }))
                }}
              >
                <SelectTrigger
                  className={dateMode === 'year' ? 'w-28' : 'w-24'}
                  style={{ height: '2.5rem' }}
                >
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-56" alignItemWithTrigger={false}>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="moment-location">Location <span className="text-rw-text-muted text-xs font-normal">(optional)</span></Label>
            <Input
              id="moment-location"
              placeholder="e.g. Barcelona, Spain"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* People */}
          <div className="space-y-1.5">
            <Label>People <span className="text-rw-text-muted text-xs font-normal">(optional)</span></Label>
            <PeopleInviteInput
              invitees={invitees}
              onAdd={addInvitee}
              onRemove={removeInvitee}
              onRoleChange={updateInviteeRole}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags <span className="text-rw-text-muted text-xs font-normal">(optional · max 20 chars)</span></Label>
            <div className="flex flex-wrap gap-1.5 rounded-rw-input border border-rw-border bg-rw-surface px-2.5 py-2 min-h-9 cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-rw-accent-subtle text-rw-accent px-2.5 py-1 text-xs font-medium">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-rw-accent/60 hover:text-rw-accent">
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
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-rw-text-muted"
              />
            </div>
            <p className="text-xs text-rw-text-muted">Press Enter or comma to add a tag.</p>
          </div>

          {error && <p className="text-sm text-rw-danger">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
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
  onRoleChange,
}: {
  invitees: InviteeDisplay[]
  onAdd: (item: InviteeDisplay) => void
  onRemove: (value: string) => void
  onRoleChange: (value: string, role: 'editor' | 'reader') => void
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
        onAdd({ type: 'email', value: q, label: q, role: 'editor' })
        setQuery('')
        setResults(null)
      }
    }
  }

  function selectUser(u: { id: string; firstName: string; lastName: string; username: string; photoUrl: string | null }) {
    onAdd({ type: 'userId', value: u.id, label: `${u.firstName} ${u.lastName}`, photoUrl: u.photoUrl, role: 'editor' })
    setQuery('')
    setResults(null)
  }

  return (
    <div className="space-y-2">
      {/* Added people chips */}
      {invitees.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {invitees.map((i) => (
            <div key={i.value} className="inline-flex items-center gap-2 rounded-lg border bg-rw-surface-raised pl-2 pr-1.5 py-1 text-xs">
              {i.type === 'userId' && (
                <Avatar className="size-5 shrink-0">
                  <AvatarImage src={i.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">{i.label[0]}</AvatarFallback>
                </Avatar>
              )}
              <span className="font-medium truncate max-w-[120px]">{i.label}</span>
              {/* Role toggle */}
              <div className="inline-flex rounded border border-rw-border-subtle overflow-hidden ml-auto shrink-0">
                {(['editor', 'reader'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onRoleChange(i.value, role)}
                    className={cn(
                      'px-2 py-0.5 capitalize transition-colors rounded-[4px]',
                      i.role === role
                        ? 'bg-rw-bg text-rw-accent shadow-sm'
                        : 'text-rw-text-muted hover:text-rw-text-primary'
                    )}
                  >
                    {role === 'editor' ? 'Editor' : 'Reader'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => onRemove(i.value)} className="text-rw-text-muted hover:text-rw-text-primary shrink-0">
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted pointer-events-none" />
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
            onAdd({ type: 'email', value: query.trim(), label: query.trim(), role: 'editor' })
            setQuery('')
          }}
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-rw-surface-raised transition-colors text-left"
        >
          <Plus className="size-3.5 text-rw-text-muted" />
          Invite <span className="font-medium">{query.trim()}</span> by email
        </button>
      )}

      {/* Search results */}
      {searching && <p className="text-xs text-rw-text-muted px-1">Searching…</p>}
      {results !== null && !searching && (
        results.length === 0 ? (
          <p className="text-xs text-rw-text-muted px-1">No users found.</p>
        ) : (
          <ul className="space-y-0.5">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => selectUser(u)}
                  className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 hover:bg-rw-surface-raised transition-colors text-left"
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={u.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-rw-text-muted truncate">@{u.username}</p>
                  </div>
                  <UserRound className="size-3.5 text-rw-text-muted ml-auto shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

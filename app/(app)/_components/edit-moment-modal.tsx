'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { updateMoment } from '@/app/(app)/moments/[id]/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MomentEditValues {
  id: string
  name: string
  dateYear: number | null
  dateMonth: number | null
  dateDay: number | null
  location: string | null
  tags: string[]
}

interface Props {
  moment: MomentEditValues
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DateMode = 'year' | 'month-year' | 'full'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function inferDateMode(year: number | null, month: number | null, day: number | null): DateMode {
  if (day) return 'full'
  if (month) return 'month-year'
  return 'year'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditMomentModal({ moment, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state — initialised from moment values
  const [name, setName] = useState(moment.name)
  const [dateMode, setDateMode] = useState<DateMode>(
    inferDateMode(moment.dateYear, moment.dateMonth, moment.dateDay)
  )
  const [dateYear, setDateYear] = useState(moment.dateYear ? String(moment.dateYear) : '')
  const [dateMonth, setDateMonth] = useState(moment.dateMonth ? String(moment.dateMonth) : '')
  const [dateDay, setDateDay] = useState(moment.dateDay ? String(moment.dateDay) : '')
  const [location, setLocation] = useState(moment.location ?? '')
  const [tags, setTags] = useState<string[]>(moment.tags)
  const [tagInput, setTagInput] = useState('')

  function handleOpenChange(val: boolean) {
    if (!val) {
      // Reset to original values on close
      setName(moment.name)
      setDateMode(inferDateMode(moment.dateYear, moment.dateMonth, moment.dateDay))
      setDateYear(moment.dateYear ? String(moment.dateYear) : '')
      setDateMonth(moment.dateMonth ? String(moment.dateMonth) : '')
      setDateDay(moment.dateDay ? String(moment.dateDay) : '')
      setLocation(moment.location ?? '')
      setTags(moment.tags)
      setTagInput('')
      setError(null)
    }
    onOpenChange(val)
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

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await updateMoment(moment.id, {
        name,
        dateYear: dateYear ? parseInt(dateYear) : null,
        dateMonth: (dateMode === 'month-year' || dateMode === 'full') && dateMonth
          ? parseInt(dateMonth)
          : null,
        dateDay: dateMode === 'full' && dateDay ? parseInt(dateDay) : null,
        location: location.trim() || null,
        tags,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      onOpenChange(false)
    })
  }

  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[484px] flex flex-col max-h-[90dvh]">
        <DialogHeader className="border-b-0 pb-0">
          <DialogTitle>Edit moment</DialogTitle>
        </DialogHeader>

        <DialogBody className="pt-5 overflow-y-auto">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-moment-name">
              Name <span className="text-rw-danger">*</span>
            </Label>
            <Input
              id="edit-moment-name"
              placeholder="e.g. Summer in Barcelona"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>
              Date{' '}
              <span className="text-rw-text-muted text-xs font-normal">(optional)</span>
            </Label>
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
                <div className="relative w-20">
                  <select
                    value={dateDay}
                    onChange={(e) => setDateDay(e.target.value)}
                    className="h-10 w-full appearance-none rounded-rw-input border border-rw-border bg-rw-surface pl-3 pr-7 text-sm outline-none focus:border-rw-accent focus:ring-2 focus:ring-rw-accent/[0.12] cursor-pointer"
                  >
                    <option value="">—</option>
                    {Array.from(
                      {
                        length: dateMonth
                          ? daysInMonth(parseInt(dateMonth), dateYear ? parseInt(dateYear) : undefined)
                          : 31,
                      },
                      (_, i) => i + 1
                    ).map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted" />
                </div>
              )}
              {/* Month (month-year + full) */}
              {(dateMode === 'month-year' || dateMode === 'full') && (
                <div className="relative flex-1">
                  <select
                    value={dateMonth}
                    onChange={(e) => {
                      const m = e.target.value
                      setDateMonth(m)
                      // Clamp day if it's now beyond the new month's max
                      if (dateMode === 'full' && dateDay && m) {
                        const max = daysInMonth(parseInt(m), dateYear ? parseInt(dateYear) : undefined)
                        if (parseInt(dateDay) > max) setDateDay(String(max))
                      }
                    }}
                    className="h-10 w-full appearance-none rounded-rw-input border border-rw-border bg-rw-surface pl-3 pr-8 text-sm outline-none focus:border-rw-accent focus:ring-2 focus:ring-rw-accent/[0.12] cursor-pointer"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted" />
                </div>
              )}
              {/* Year — dropdown 1900–3000; native picker scrolls to selected value on open */}
              <div className={cn('relative', dateMode === 'year' ? 'w-28' : 'w-24')}>
                <select
                  value={dateYear}
                  onChange={(e) => {
                    const y = e.target.value
                    setDateYear(y)
                    // Clamp day if Feb 29 becomes invalid (non-leap year)
                    if (dateMode === 'full' && dateDay && dateMonth && y) {
                      const max = daysInMonth(parseInt(dateMonth), parseInt(y))
                      if (parseInt(dateDay) > max) setDateDay(String(max))
                    }
                  }}
                  className="h-10 w-full appearance-none rounded-rw-input border border-rw-border bg-rw-surface pl-3 pr-8 text-sm outline-none focus:border-rw-accent focus:ring-2 focus:ring-rw-accent/[0.12] cursor-pointer"
                >
                  <option value="">—</option>
                  {YEARS.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-moment-location">
              Location{' '}
              <span className="text-rw-text-muted text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="edit-moment-location"
              placeholder="e.g. Barcelona, Spain"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>
              Tags{' '}
              <span className="text-rw-text-muted text-xs font-normal">
                (optional · max 20 chars)
              </span>
            </Label>
            <div
              className="flex flex-wrap gap-1.5 rounded-rw-input border border-rw-border bg-rw-surface px-2.5 py-2 min-h-9 cursor-text"
              onClick={() => document.getElementById('edit-tag-input')?.focus()}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-rw-accent-subtle text-rw-accent px-2.5 py-1 text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-rw-accent/60 hover:text-rw-accent"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="edit-tag-input"
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
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

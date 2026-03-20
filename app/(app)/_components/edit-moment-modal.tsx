'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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

  const currentYear = new Date().getFullYear()
  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit moment</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-moment-name">
              Name <span className="text-destructive">*</span>
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
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
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
            <Label htmlFor="edit-moment-location">
              Location{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
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
              <span className="text-muted-foreground text-xs font-normal">
                (optional · max 20 chars)
              </span>
            </Label>
            <div
              className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 min-h-9 cursor-text"
              onClick={() => document.getElementById('edit-tag-input')?.focus()}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-muted-foreground hover:text-foreground"
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
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

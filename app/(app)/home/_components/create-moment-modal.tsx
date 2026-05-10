'use client'

import { useState, useTransition } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { cn } from '@/lib/utils'
import { MONTHS, YEARS, daysInMonth, type DateMode } from '@/lib/date-helpers'
import { createMoment, type Invitee } from '../actions'
import { PeopleInviteInput, type InviteeDisplay } from './people-invite-input'

const CURRENT_YEAR = new Date().getFullYear()

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMomentModal({ open, onOpenChange }: Props) {
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
  const [invitees, setInvitees] = useState<InviteeDisplay[]>([])

  function reset() {
    setName('')
    setDateMode('year')
    setDateYear(String(CURRENT_YEAR))
    setDateMonth('')
    setDateDay('')
    setLocation('')
    setTags([])
    setInvitees([])
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
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
          ? MONTHS.indexOf(dateMonth) + 1
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

      onOpenChange(false)
      reset()
    })
  }

  const canSubmit = name.trim().length > 0 && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              aria-invalid={!!error}
              aria-describedby={error ? 'moment-error' : undefined}
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
                      const max = daysInMonth(MONTHS.indexOf(dateMonth) + 1, dateYear ? parseInt(dateYear) : undefined)
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
                          ? daysInMonth(MONTHS.indexOf(dateMonth) + 1, dateYear ? parseInt(dateYear) : undefined)
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
                      const max = daysInMonth(MONTHS.indexOf(actual) + 1, dateYear ? parseInt(dateYear) : undefined)
                      if (parseInt(dateDay) > max) setDateDay(String(max))
                    }
                  }}
                >
                  <SelectTrigger className="flex-1" style={{ height: '2.5rem' }}>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56" alignItemWithTrigger={false}>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
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
                    const max = daysInMonth(MONTHS.indexOf(dateMonth) + 1, parseInt(actual))
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
            <Label htmlFor="tag-input">Tags <span className="text-rw-text-muted text-xs font-normal">(optional · max 20 chars)</span></Label>
            <TagInput tags={tags} onChange={setTags} inputId="tag-input" />
          </div>

          {error && <p id="moment-error" role="alert" className="text-sm text-rw-danger">{error}</p>}
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


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
import { MONTHS, inferDateMode, type DateMode } from '@/lib/date-helpers'
import { TagInput } from '@/components/ui/tag-input'
import { LocationCombobox } from '@/components/ui/location-combobox'
import { MomentDatePicker } from '@/app/(app)/_components/moment-date-picker'
import { updateMoment } from '@/app/(app)/moments/[id]/actions'
import type { PlaceValue } from '@/lib/places/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MomentEditValues {
  id: string
  name: string
  dateYear: number | null
  dateMonth: number | null
  dateDay: number | null
  location: string | null
  placeKind: 'city' | 'country' | null
  placeCountryCode: string | null
  placeLat: number | null
  placeLng: number | null
  tags: string[]
}

/** Reconstruct the structured PlaceValue from a moment's stored columns, or null
 *  when the moment has no structured place (never set, or legacy free-text). */
function initialPlace(moment: MomentEditValues): PlaceValue | null {
  if (
    moment.placeKind &&
    moment.placeCountryCode &&
    moment.placeLat != null &&
    moment.placeLng != null &&
    moment.location
  ) {
    return {
      kind: moment.placeKind,
      label: moment.location,
      countryCode: moment.placeCountryCode,
      lat: moment.placeLat,
      lng: moment.placeLng,
    }
  }
  return null
}

interface Props {
  moment: MomentEditValues
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [dateMonth, setDateMonth] = useState(moment.dateMonth ? MONTHS[moment.dateMonth - 1] ?? '' : '')
  const [dateDay, setDateDay] = useState(moment.dateDay ? String(moment.dateDay) : '')
  const [place, setPlace] = useState<PlaceValue | null>(() => initialPlace(moment))
  // Whether the user changed the location this session. When false, the original
  // location (structured or legacy free-text) is preserved untouched on save.
  const [placeTouched, setPlaceTouched] = useState(false)
  const [tags, setTags] = useState<string[]>(moment.tags)

  function handleOpenChange(val: boolean) {
    if (!val) {
      // Reset to original values on close
      setName(moment.name)
      setDateMode(inferDateMode(moment.dateYear, moment.dateMonth, moment.dateDay))
      setDateYear(moment.dateYear ? String(moment.dateYear) : '')
      setDateMonth(moment.dateMonth ? MONTHS[moment.dateMonth - 1] ?? '' : '')
      setDateDay(moment.dateDay ? String(moment.dateDay) : '')
      setPlace(initialPlace(moment))
      setPlaceTouched(false)
      setTags(moment.tags)
      setError(null)
    }
    onOpenChange(val)
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await updateMoment(moment.id, {
        name,
        dateYear: dateYear ? parseInt(dateYear) : null,
        dateMonth: (dateMode === 'month-year' || dateMode === 'full') && dateMonth
          ? MONTHS.indexOf(dateMonth) + 1
          : null,
        dateDay: dateMode === 'full' && dateDay ? parseInt(dateDay) : null,
        // Untouched → preserve the original location (structured or legacy text).
        // Touched → the current selection (a place, or null when cleared).
        location: placeTouched ? (place ? place.label : null) : moment.location,
        place: placeTouched ? place : initialPlace(moment),
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
              aria-invalid={!!error}
              aria-describedby={error ? 'edit-moment-error' : undefined}
            />
          </div>

          {/* Date */}
          <MomentDatePicker
            mode={dateMode}
            year={dateYear}
            month={dateMonth}
            day={dateDay}
            setMode={setDateMode}
            setYear={setDateYear}
            setMonth={setDateMonth}
            setDay={setDateDay}
          />

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-moment-location">
              Location{' '}
              <span className="text-rw-text-muted text-xs font-normal">(optional)</span>
            </Label>
            <LocationCombobox
              id="edit-moment-location"
              value={place}
              onChange={(v) => { setPlace(v); setPlaceTouched(true) }}
              fallbackLabel={initialPlace(moment) ? null : moment.location}
              placeholder="e.g. Barcelona, Spain"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-tag-input">
              Tags{' '}
              <span className="text-rw-text-muted text-xs font-normal">(optional · max 20 chars)</span>
            </Label>
            <TagInput tags={tags} onChange={setTags} inputId="edit-tag-input" />
          </div>

          {error && <p id="edit-moment-error" role="alert" className="text-sm text-rw-danger">{error}</p>}
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

'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MONTHS, YEARS, daysInMonth, type DateMode } from '@/lib/date-helpers'

/**
 * Controlled date picker shared by the create- and edit-moment modals.
 *
 * A moment's date can be recorded at three precisions — year only, month+year,
 * or a full date — selected via the mode toggle. Day/month values are clamped
 * whenever the surrounding fields change so an impossible date (e.g. Feb 29 in a
 * non-leap year) can never be produced. State lives in the parent; this
 * component is purely presentational + clamp logic.
 */
export interface MomentDatePickerProps {
  mode: DateMode
  year: string
  month: string
  day: string
  setMode: (mode: DateMode) => void
  setYear: (year: string) => void
  setMonth: (month: string) => void
  setDay: (day: string) => void
}

export function MomentDatePicker({
  mode,
  year,
  month,
  day,
  setMode,
  setYear,
  setMonth,
  setDay,
}: MomentDatePickerProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        Date <span className="text-rw-text-muted text-xs font-normal">(optional)</span>
      </Label>
      {/* Mode selector */}
      <div className="inline-flex rounded-lg border border-rw-border-subtle bg-rw-surface-raised p-0.5 gap-0.5 text-xs">
        {(['year', 'month-year', 'full'] as DateMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              // Clamp stored day when switching into full mode
              if (m === 'full' && day && month) {
                const max = daysInMonth(MONTHS.indexOf(month) + 1, year ? parseInt(year) : undefined)
                if (parseInt(day) > max) setDay(String(max))
              }
            }}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium transition-colors',
              mode === m
                ? 'bg-rw-bg text-rw-text-primary shadow-sm'
                : 'text-rw-text-muted hover:text-rw-text-primary'
            )}
          >
            {m === 'year' ? 'Year' : m === 'month-year' ? 'Month + Year' : 'Full date'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Day — dropdown 1–N where N = days in selected month/year */}
        {mode === 'full' && (
          <Select value={day} onValueChange={(d) => setDay(d === null ? '' : d)}>
            <SelectTrigger className="w-20" style={{ height: '2.5rem' }}>
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent className="max-h-56" alignItemWithTrigger={false}>
              {Array.from(
                {
                  length: month
                    ? daysInMonth(MONTHS.indexOf(month) + 1, year ? parseInt(year) : undefined)
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
        {(mode === 'month-year' || mode === 'full') && (
          <Select
            value={month}
            onValueChange={(m) => {
              const actual = m === null ? '' : m
              setMonth(actual)
              // Clamp day if it's now beyond the new month's max
              if (mode === 'full' && day && actual) {
                const max = daysInMonth(MONTHS.indexOf(actual) + 1, year ? parseInt(year) : undefined)
                if (parseInt(day) > max) setDay(String(max))
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
          value={year}
          onValueChange={(y) => {
            const actual = y === null ? '' : y
            setYear(actual)
            // Clamp day if Feb 29 becomes invalid (non-leap year)
            if (mode === 'full' && day && month && actual) {
              const max = daysInMonth(MONTHS.indexOf(month) + 1, parseInt(actual))
              if (parseInt(day) > max) setDay(String(max))
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
          <SelectTrigger className={mode === 'year' ? 'w-28' : 'w-24'} style={{ height: '2.5rem' }}>
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
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X, Globe2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchPlaces } from '@/app/(app)/_actions/places'
import type { PlaceValue, PlaceSearchResult } from '@/lib/places/types'

interface Props {
  /** The structured selection, or null when empty. Controlled by the parent. */
  value: PlaceValue | null
  /**
   * Called ONLY on an explicit user action: selecting a result (PlaceValue) or
   * clearing the field (null). Never fired while typing. Parents can therefore
   * treat any call as "the user changed the location".
   */
  onChange: (value: PlaceValue | null) => void
  /**
   * Legacy free-text to display when `value` is null (e.g. a moment's old
   * `location` string that has no coordinates yet). Shown as the initial chip
   * until the user clears it or picks a real place.
   */
  fallbackLabel?: string | null
  id?: string
  placeholder?: string
}

/**
 * Single-select place picker with a debounced server-side search. It has two
 * modes to keep behaviour predictable (no caret/focus races):
 *   - "display": a chip showing the selected place (or legacy fallback) + a
 *     clear button. Clicking the chip body re-opens search to change it.
 *   - "search": an editable input with a live results list.
 */
export function LocationCombobox({
  value,
  onChange,
  fallbackLabel,
  id,
  placeholder = 'Search for a city or country…',
}: Props) {
  // Once the user interacts (selects or clears), the legacy fallback is dropped.
  const [touched, setTouched] = useState(false)
  const displayLabel = value?.label ?? (touched ? null : fallbackLabel) ?? null
  const displayKind = value?.kind ?? (displayLabel ? 'city' : null) // fallback shows a pin

  const [mode, setMode] = useState<'display' | 'search'>(displayLabel ? 'display' : 'search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Focus the input whenever we switch into search mode.
  useEffect(() => {
    if (mode === 'search') inputRef.current?.focus()
  }, [mode])

  // Debounced async search. Mirrors the race-guard + debounce pattern in
  // people-invite-input.tsx.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced async search; clear results when the query is too short
      setResults(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++searchIdRef.current
      setSearching(true)
      const res = await searchPlaces(query.trim())
      if (searchIdRef.current !== id) return
      setSearching(false)
      setActiveIndex(0)
      setResults(res)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close the results list on outside click.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function enterSearch() {
    setQuery('')
    setResults(null)
    setMode('search')
  }

  function select(r: PlaceSearchResult) {
    setTouched(true)
    onChange({ kind: r.kind, label: r.label, countryCode: r.countryCode, lat: r.lat, lng: r.lng })
    setQuery('')
    setResults(null)
    setSearching(false)
    setMode('display')
  }

  function clearAll() {
    setTouched(true)
    onChange(null)
    setQuery('')
    setResults(null)
    setSearching(false)
    setMode('search')
  }

  function onBlur() {
    // Give a click on a result time to register, then, if nothing was picked and
    // a committed value still exists, drop back to the display chip.
    setTimeout(() => {
      if (displayLabel && document.activeElement !== inputRef.current) {
        setResults(null)
        setMode('display')
      }
    }, 150)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (displayLabel) setMode('display')
      setResults(null)
      return
    }
    if (!results || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[activeIndex]
      if (r) select(r)
    }
  }

  // ── Display mode: chip with the selected place + clear button ───────────────
  if (mode === 'display' && displayLabel) {
    const Icon = displayKind === 'country' ? Globe2 : MapPin
    return (
      <div className="relative">
        <button
          type="button"
          onClick={enterSearch}
          className="flex h-10 w-full items-center gap-2 rounded-rw-input border border-rw-border bg-rw-surface pl-2.5 pr-9 text-left text-base md:text-[14px] font-medium text-rw-text-primary transition-colors outline-none focus-visible:border-rw-accent focus-visible:ring-3 focus-visible:ring-rw-accent/[0.12]"
        >
          <Icon className="size-3.5 shrink-0 text-rw-text-muted" />
          <span className="truncate">{displayLabel}</span>
        </button>
        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear location"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-rw-text-muted hover:text-rw-text-primary hover:bg-rw-surface-raised transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  // ── Search mode: editable input + results list ──────────────────────────────
  return (
    <div ref={containerRef} className="relative space-y-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-rw-text-muted pointer-events-none" />
        <Input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={results !== null}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="pl-8"
        />
      </div>

      {searching && <p className="text-xs text-rw-text-muted px-1">Searching…</p>}

      {results !== null && !searching && (
        results.length === 0 ? (
          <p className="text-xs text-rw-text-muted px-1">No places found.</p>
        ) : (
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto rounded-rw-popover border border-rw-border/60 bg-rw-bg shadow-rw-popover p-1"
          >
            {results.map((r, i) => (
              <li key={r.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  // onMouseDown (not onClick) so it fires before the input's blur.
                  onMouseDown={(e) => { e.preventDefault(); select(r) }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-left transition-colors min-h-11',
                    i === activeIndex ? 'bg-rw-surface-raised' : 'hover:bg-rw-surface-raised'
                  )}
                >
                  {r.kind === 'country' ? (
                    <Globe2 className="size-4 shrink-0 text-rw-text-muted" />
                  ) : (
                    <MapPin className="size-4 shrink-0 text-rw-text-muted" />
                  )}
                  <span className="text-sm truncate">{r.label}</span>
                  {r.kind === 'country' && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-rw-text-placeholder">
                      Country
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

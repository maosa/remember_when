// Pure server-input validation for a place selection. No dataset import, so it's
// cheap and safe anywhere. Server actions must never trust the client-sent place
// blob — run it through this first.
import type { PlaceValue, PlaceKind } from './types'

const KINDS: PlaceKind[] = ['city', 'country']

/**
 * Coerces an untrusted value (as sent from the LocationCombobox) into a valid
 * PlaceValue, or null if it is absent/malformed. Enforces the same invariants as
 * the DB check constraints (kind ∈ {city,country}, ISO-2 country code, lat/lng in
 * range) so a bad payload degrades to "no location" rather than erroring.
 */
export function normalizePlaceInput(raw: unknown): PlaceValue | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>

  const kind = p.kind
  if (typeof kind !== 'string' || !KINDS.includes(kind as PlaceKind)) return null

  const countryCode = typeof p.countryCode === 'string' ? p.countryCode.trim().toUpperCase() : ''
  if (!/^[A-Z]{2}$/.test(countryCode)) return null

  const lat = typeof p.lat === 'number' ? p.lat : NaN
  const lng = typeof p.lng === 'number' ? p.lng : NaN
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null

  const label = typeof p.label === 'string' ? p.label.trim().slice(0, 200) : ''
  if (!label) return null

  return { kind: kind as PlaceKind, label, countryCode, lat, lng }
}

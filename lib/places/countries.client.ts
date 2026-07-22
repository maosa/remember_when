// Client-safe country lookups. Imports ONLY countries.json (~16 KB) — never
// cities.json — so it is safe to pull into the map client component.
import countriesRaw from './countries.json'

type CountryRow = { cc: string; name: string; capLat: number; capLng: number }

const byCc = new Map((countriesRaw as CountryRow[]).map((c) => [c.cc, c]))

/** Country display name for an ISO-3166 alpha-2 code (falls back to the code). */
export function countryName(cc: string | null): string {
  if (!cc) return 'Unknown'
  return byCc.get(cc)?.name ?? cc
}

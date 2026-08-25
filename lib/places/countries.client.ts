// Client-safe country lookups. Imports ONLY countries.json (~16 KB) — never
// cities.json — so it is safe to pull into the map client component.
import countriesRaw from './countries.json'

type CountryRow = { cc: string; name: string; capLat: number; capLng: number; n3: string | null }

const rows = countriesRaw as CountryRow[]
const byCc = new Map(rows.map((c) => [c.cc, c]))
// ISO-3166 numeric code → alpha-2, to resolve world-atlas TopoJSON geometry ids
// (which are numeric, e.g. "826") to our country codes. Padded to 3 digits.
const ccByN3 = new Map(rows.filter((c) => c.n3).map((c) => [String(c.n3).padStart(3, '0'), c.cc]))

/** Country display name for an ISO-3166 alpha-2 code (falls back to the code). */
export function countryName(cc: string | null): string {
  if (!cc) return 'Unknown'
  return byCc.get(cc)?.name ?? cc
}

/** ISO-2 code for a TopoJSON geometry's numeric id (ISO-3166 numeric), or null. */
export function ccForNumericId(id: string | number | null | undefined): string | null {
  if (id == null) return null
  return ccByN3.get(String(id).padStart(3, '0')) ?? null
}

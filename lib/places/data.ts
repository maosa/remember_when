// Server-only place dataset + search. Imports the ~4 MB committed city list (plus
// regions + countries), so this module must NEVER be imported from a client
// component — only from server actions / server components. Client code should
// import ./types instead.
//
// Regenerate the underlying JSON with `npm run gen:places` (see ./README.md).
import citiesRaw from './cities.json'
import regionsRaw from './regions.json'
import countriesRaw from './countries.json'
import type { PlaceSearchResult } from './types'

type CityRow = {
  id: number
  city: string
  cc: string
  lat: number
  lng: number
  pop: number
  cap: 0 | 1
}
type RegionRow = { iso: string; cc: string; name: string; lat: number; lng: number }
type CountryRow = { cc: string; name: string; capLat: number; capLng: number }

// The datasets are static, so their names are normalized once at module load
// rather than on every keystroke. `_n` holds the pre-normalized name (searching
// 49k cities would otherwise run ~150k NFD+regex passes per debounced query).
type CityRowN = CityRow & { _n: string }
type RegionRowN = RegionRow & { _n: string }
type CountryRowN = CountryRow & { _n: string }

// cities.json is pre-sorted by population descending, so iteration order already
// ranks results without any per-query sort.
const cities: CityRowN[] = (citiesRaw as CityRow[]).map((c) => ({ ...c, _n: normalize(c.city) }))
const regions: RegionRowN[] = (regionsRaw as RegionRow[]).map((r) => ({ ...r, _n: normalize(r.name) }))
const countries: CountryRowN[] = (countriesRaw as CountryRow[]).map((c) => ({ ...c, _n: normalize(c.name) }))

const countryByCc = new Map(countries.map((c) => [c.cc, c]))

/** Country display name for an ISO-3166 alpha-2 code, or null if unknown. */
export function getCountryName(cc: string): string | null {
  return countryByCc.get(cc)?.name ?? null
}

/** Country row (name + capital coords) for an ISO-3166 alpha-2 code. */
export function getCountry(cc: string): CountryRow | null {
  return countryByCc.get(cc) ?? null
}

// Lowercase + strip diacritics so "malaga" matches "Málaga".
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const cityLabel = (city: CityRow): string => `${city.city}, ${countryByCc.get(city.cc)?.name ?? city.cc}`

const regionLabel = (r: RegionRow): string => `${r.name}, ${countryByCc.get(r.cc)?.name ?? r.cc}`

/**
 * Search cities + regions + countries for the combobox. Returns, capped at `limit`:
 *   1. matching countries (so typing "spain" surfaces the country first), then
 *   2. matching admin regions / states (so "connecticut" surfaces the state), then
 *   3. cities whose name starts with the query, then
 *   4. cities of a matching country (typing "spain" lists Spanish cities), then
 *   5. cities whose name merely contains the query.
 * Cities within each tier stay population-ranked via the pre-sorted array.
 */
export function searchPlaces(query: string, limit = 20): PlaceSearchResult[] {
  const q = normalize(query)
  if (q.length < 2) return []

  const results: PlaceSearchResult[] = []
  const seen = new Set<string>()
  const push = (r: PlaceSearchResult) => {
    if (seen.has(r.key) || results.length >= limit) return
    seen.add(r.key)
    results.push(r)
  }

  // 1. Countries (name starts-with ranks above contains), capped so cities still show.
  const countryHits = countries
    .map((c) => ({ c, n: c._n }))
    .filter(({ n }) => n.includes(q))
    .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.c.name.localeCompare(b.c.name))
    .slice(0, 5)
  const matchedCountryCodes = new Set(countryHits.map(({ c }) => c.cc))
  for (const { c } of countryHits) {
    push({ kind: 'country', label: c.name, countryCode: c.cc, lat: c.capLat, lng: c.capLng, key: `country:${c.cc}` })
  }

  // 2. Admin regions / states (name starts-with ranks above contains), capped.
  const regionHits = regions
    .map((r) => ({ r, n: r._n }))
    .filter(({ n }) => n.includes(q))
    .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.r.name.localeCompare(b.r.name))
    .slice(0, 6)
  for (const { r } of regionHits) {
    push({ kind: 'region', label: regionLabel(r), countryCode: r.cc, lat: r.lat, lng: r.lng, key: `region:${r.cc}-${r.iso}` })
  }

  // 3–5. Cities, in tier order, each pass already population-ranked.
  const cityResult = (city: CityRow): PlaceSearchResult => ({
    kind: 'city',
    label: cityLabel(city),
    countryCode: city.cc,
    lat: city.lat,
    lng: city.lng,
    key: `city:${city.id}`,
  })
  const tiers: Array<(city: CityRowN) => boolean> = [
    (city) => city._n.startsWith(q),
    (city) => matchedCountryCodes.has(city.cc),
    (city) => city._n.includes(q),
  ]
  for (const matches of tiers) {
    if (results.length >= limit) break
    for (const city of cities) {
      if (results.length >= limit) break
      if (matches(city)) push(cityResult(city))
    }
  }

  return results
}

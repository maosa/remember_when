// Server-only place dataset + search. Imports the ~2 MB committed city list, so
// this module must NEVER be imported from a client component — only from server
// actions / server components. Client code should import ./types instead.
//
// Regenerate the underlying JSON with `npm run gen:places` (see ./README.md).
import citiesRaw from './cities.json'
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
type CountryRow = { cc: string; name: string; capLat: number; capLng: number }

// cities.json is pre-sorted by population descending, so iteration order already
// ranks results without any per-query sort.
const cities = citiesRaw as CityRow[]
const countries = countriesRaw as CountryRow[]

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

/**
 * Search cities + countries for the combobox. Returns, capped at `limit`:
 *   1. matching countries (so typing "spain" surfaces the country first), then
 *   2. cities whose name starts with the query, then
 *   3. cities of a matching country (typing "spain" lists Spanish cities), then
 *   4. cities whose name merely contains the query.
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
    .map((c) => ({ c, n: normalize(c.name) }))
    .filter(({ n }) => n.includes(q))
    .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.c.name.localeCompare(b.c.name))
    .slice(0, 5)
  const matchedCountryCodes = new Set(countryHits.map(({ c }) => c.cc))
  for (const { c } of countryHits) {
    push({ kind: 'country', label: c.name, countryCode: c.cc, lat: c.capLat, lng: c.capLng, key: `country:${c.cc}` })
  }

  // 2–4. Cities, in tier order, each pass already population-ranked.
  const cityResult = (city: CityRow): PlaceSearchResult => ({
    kind: 'city',
    label: cityLabel(city),
    countryCode: city.cc,
    lat: city.lat,
    lng: city.lng,
    key: `city:${city.id}`,
  })
  const tiers: Array<(name: string, city: CityRow) => boolean> = [
    (name) => name.startsWith(q),
    (_name, city) => matchedCountryCodes.has(city.cc),
    (name) => name.includes(q),
  ]
  for (const matches of tiers) {
    if (results.length >= limit) break
    for (const city of cities) {
      if (results.length >= limit) break
      if (matches(normalize(city.city), city)) push(cityResult(city))
    }
  }

  return results
}

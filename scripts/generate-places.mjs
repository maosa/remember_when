// Generates the trimmed place dataset committed under lib/places/ from the
// GeoNames-derived `all-the-cities` + `world-countries` + `country-state-city`
// dev dependencies and the `world-atlas` TopoJSON. Run with `npm run gen:places`.
// The output files are committed so the runtime never imports the heavy source
// packages.
//
//   lib/places/cities.json     ~49k cities (population >= 5000, plus every
//                              national capital), shape { id, city, cc, lat,
//                              lng, pop, cap }. Country NAME is not stored per
//                              city — it is looked up from countries.json by cc.
//   lib/places/regions.json    ~5k admin regions (US states, provinces, …),
//                              shape { iso, name, cc, lat, lng }. Lets moments be
//                              tagged to e.g. "Connecticut, United States".
//   lib/places/countries.json  one row per country: { cc, name, capLat, capLng }
//                              (capital coordinates; country-only moments are
//                              plotted here).
//   lib/places/world.json      world map TopoJSON (50m, copied from world-atlas).
import { createRequire } from 'node:module'
import { writeFileSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const cities = require('all-the-cities')
const countries = require('world-countries')
const { State } = require('country-state-city')

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'places')

const MIN_POPULATION = 5000

// ── Countries: name + capital coordinates ───────────────────────────────────
// Capital coords come from the country's PPLC (capital) city in all-the-cities;
// fall back to the country centroid (world-countries latlng) when GeoNames has
// no capital feature for that country.
const capitalByCc = new Map()
for (const c of cities) {
  if (c.featureCode !== 'PPLC') continue
  const prev = capitalByCc.get(c.country)
  if (!prev || c.population > prev.population) capitalByCc.set(c.country, c)
}

const countryRows = []
const countryName = new Map()
for (const c of countries) {
  const cc = c.cca2
  if (!cc || cc.length !== 2) continue
  const name = c.name?.common
  if (!name) continue
  countryName.set(cc, name)
  const cap = capitalByCc.get(cc)
  const [lat, lng] = cap
    ? [cap.loc.coordinates[1], cap.loc.coordinates[0]]
    : Array.isArray(c.latlng) && c.latlng.length === 2
      ? [c.latlng[0], c.latlng[1]]
      : [null, null]
  if (lat == null || lng == null) continue
  countryRows.push({ cc, name, capLat: round(lat), capLng: round(lng) })
}
countryRows.sort((a, b) => a.name.localeCompare(b.name))

// ── Cities: population threshold, but always keep national capitals ─────────
const cityRows = []
for (const c of cities) {
  const isCapital = c.featureCode === 'PPLC'
  if (c.population < MIN_POPULATION && !isCapital) continue
  if (!countryName.has(c.country)) continue // skip cities in unknown territories
  cityRows.push({
    id: c.cityId,
    city: c.name,
    cc: c.country,
    lat: round(c.loc.coordinates[1]),
    lng: round(c.loc.coordinates[0]),
    pop: c.population,
    cap: isCapital ? 1 : 0,
  })
}
// Highest population first so search results are ranked without re-sorting.
cityRows.sort((a, b) => b.pop - a.pop)

// ── Regions: admin-1 areas (US states, provinces, …) with coordinates ────────
// Only keep regions whose country is known and that have valid coordinates.
const regionRows = []
for (const s of State.getAllStates()) {
  if (!countryName.has(s.countryCode)) continue
  const lat = Number(s.latitude)
  const lng = Number(s.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
  regionRows.push({ iso: s.isoCode, cc: s.countryCode, name: s.name, lat: round(lat), lng: round(lng) })
}
regionRows.sort((a, b) => a.name.localeCompare(b.name))

function round(n) {
  return Math.round(n * 10000) / 10000
}

writeFileSync(join(outDir, 'cities.json'), JSON.stringify(cityRows))
writeFileSync(join(outDir, 'regions.json'), JSON.stringify(regionRows))
writeFileSync(join(outDir, 'countries.json'), JSON.stringify(countryRows))
// 50m detail (vs 110m) so borders stay crisp when the map is zoomed in.
copyFileSync(
  require.resolve('world-atlas/countries-50m.json'),
  join(outDir, 'world.json')
)

console.log(
  `Wrote ${cityRows.length} cities, ${regionRows.length} regions, ${countryRows.length} countries, and world.json to lib/places/`
)

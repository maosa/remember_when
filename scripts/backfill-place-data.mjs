// One-time best-effort backfill: match existing free-text `moments.location`
// strings against the bundled place dataset and populate the structured
// place_kind / place_country_code / place_lat / place_lng columns so legacy
// moments appear on the map. Unmatched rows are left untouched (they stay in the
// map's "No location" bucket until re-edited).
//
// Idempotent: only touches rows where place_kind is null and location is set.
// Reversible: re-running does nothing new; to undo, null the place_* columns.
//
//   node scripts/backfill-place-data.mjs           # apply
//   node scripts/backfill-place-data.mjs --dry-run # preview only
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cities = require('../lib/places/cities.json')
const countries = require('../lib/places/countries.json')

const DRY_RUN = process.argv.includes('--dry-run')

// ── env ─────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase env in .env.local')

// ── matching indexes ──────────────────────────────────────────────────────────
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

// Common country abbreviations users type that don't match the dataset name.
const COUNTRY_ALIASES = {
  uk: 'united kingdom',
  'u.k.': 'united kingdom',
  'great britain': 'united kingdom',
  england: 'united kingdom',
  usa: 'united states',
  us: 'united states',
  'u.s.': 'united states',
  'u.s.a.': 'united states',
  america: 'united states',
  uae: 'united arab emirates',
}
const canonCountry = (norm) => COUNTRY_ALIASES[norm] ?? norm

const countryNameByCc = new Map(countries.map((c) => [c.cc, c.name]))
const countryByNorm = new Map(countries.map((c) => [normalize(c.name), c]))

const cityByNorm = new Map() // normCity -> City[]
const cityByNormCityCountry = new Map() // `${normCity}|${normCountry}` -> City[]
for (const c of cities) {
  const nc = normalize(c.city)
  ;(cityByNorm.get(nc) ?? cityByNorm.set(nc, []).get(nc)).push(c)
  const cn = countryNameByCc.get(c.cc)
  if (cn) {
    const key = `${nc}|${normalize(cn)}`
    ;(cityByNormCityCountry.get(key) ?? cityByNormCityCountry.set(key, []).get(key)).push(c)
  }
}

const maxPop = (arr) => arr.reduce((a, b) => (b.pop > a.pop ? b : a))

function matchLocation(loc) {
  const n = normalize(loc)
  if (!n) return null

  // 1. Country-only exact ("Spain").
  const country = countryByNorm.get(canonCountry(n))
  if (country) {
    return { place_kind: 'country', place_country_code: country.cc, place_lat: country.capLat, place_lng: country.capLng }
  }

  // 2. "City, Country" ("Barcelona, Spain").
  const parts = loc.split(',').map(normalize).filter(Boolean)
  if (parts.length >= 2) {
    const key = `${parts[0]}|${canonCountry(parts[parts.length - 1])}`
    const cand = cityByNormCityCountry.get(key)
    if (cand?.length) {
      const c = maxPop(cand)
      return { place_kind: 'city', place_country_code: c.cc, place_lat: c.lat, place_lng: c.lng }
    }
  }

  // 3. Bare city name, unambiguous by highest population ("Milan").
  const cand = cityByNorm.get(n)
  if (cand?.length) {
    const c = maxPop(cand)
    return { place_kind: 'city', place_country_code: c.cc, place_lat: c.lat, place_lng: c.lng }
  }

  return null
}

// ── run ───────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const { data: rows, error } = await supabase
  .from('moments')
  .select('id, location')
  .is('place_kind', null)
  .not('location', 'is', null)

if (error) throw error

let matched = 0
const unmatched = []
for (const row of rows ?? []) {
  const m = matchLocation(row.location)
  if (!m) {
    unmatched.push(row.location)
    continue
  }
  matched++
  console.log(`  ✓ "${row.location}" → ${m.place_kind} ${m.place_country_code} (${m.place_lat}, ${m.place_lng})`)
  if (!DRY_RUN) {
    const { error: upErr } = await supabase.from('moments').update(m).eq('id', row.id)
    if (upErr) console.error(`    ! update failed for ${row.id}: ${upErr.message}`)
  }
}

console.log(
  `\n${DRY_RUN ? '[dry-run] ' : ''}${rows?.length ?? 0} candidate row(s): ${matched} matched, ${unmatched.length} left for the "No location" bucket.`
)
if (unmatched.length) console.log('Unmatched:', unmatched)

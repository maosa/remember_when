// Pure, client-safe clustering helpers for the moments map. No dataset import.

export type MapMoment = {
  id: string
  name: string
  location: string | null
  countryCode: string | null
  lat: number | null
  lng: number | null
  coverPhotoUrl: string | null
  dateYear: number | null
  dateMonth: number | null
  dateDay: number | null
  createdAt: string
}

/** Effective date of a moment: its tagged date, else when it was created. */
function momentDate(m: MapMoment): number {
  if (m.dateYear) return +new Date(m.dateYear, (m.dateMonth ?? 1) - 1, m.dateDay ?? 1)
  return +new Date(m.createdAt)
}

/** Sort moments newest → oldest by effective date (in place-safe copy). */
export function sortNewestFirst(moments: MapMoment[]): MapMoment[] {
  return [...moments].sort((a, b) => momentDate(b) - momentDate(a))
}

export type Cluster = {
  key: string
  lat: number
  lng: number
  countryCode: string | null
  moments: MapMoment[]
}

/** Split moments into those with coordinates (mappable) and those without. */
export function partitionLocated(moments: MapMoment[]): {
  located: MapMoment[]
  unlocated: MapMoment[]
} {
  const located: MapMoment[] = []
  const unlocated: MapMoment[] = []
  for (const m of moments) {
    if (m.lat != null && m.lng != null) located.push(m)
    else unlocated.push(m)
  }
  return { located, unlocated }
}

function push(groups: Map<string, MapMoment[]>, key: string, m: MapMoment) {
  const arr = groups.get(key)
  if (arr) arr.push(m)
  else groups.set(key, [m])
}

/**
 * One cluster per country, positioned at the centroid of its members. Used when
 * the map is zoomed out (a single dot with a count per country).
 */
export function clusterByCountry(located: MapMoment[]): Cluster[] {
  const groups = new Map<string, MapMoment[]>()
  for (const m of located) push(groups, m.countryCode ?? '??', m)

  const clusters: Cluster[] = []
  for (const [cc, ms] of groups) {
    const lat = ms.reduce((s, m) => s + m.lat!, 0) / ms.length
    const lng = ms.reduce((s, m) => s + m.lng!, 0) / ms.length
    clusters.push({ key: `country:${cc}`, lat, lng, countryCode: cc === '??' ? null : cc, moments: ms })
  }
  return clusters
}

/**
 * One cluster per distinct coordinate (city). Country-only moments carry their
 * country's capital coordinates, so they naturally group at the capital — with
 * any capital-city moments if present. Used when zoomed in.
 */
export function clusterByCity(located: MapMoment[]): Cluster[] {
  const groups = new Map<string, MapMoment[]>()
  for (const m of located) push(groups, `${m.lat!.toFixed(3)},${m.lng!.toFixed(3)}`, m)

  const clusters: Cluster[] = []
  for (const [key, ms] of groups) {
    clusters.push({ key: `city:${key}`, lat: ms[0].lat!, lng: ms[0].lng!, countryCode: ms[0].countryCode ?? null, moments: ms })
  }
  return clusters
}

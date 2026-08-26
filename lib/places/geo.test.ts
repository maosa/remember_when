import { describe, it, expect } from 'vitest'
import {
  sortNewestFirst,
  partitionLocated,
  clusterByCountry,
  clusterByCity,
  type MapMoment,
} from '@/lib/places/geo'

// Minimal MapMoment factory — only the fields a given test cares about need to
// be overridden; the rest get harmless defaults.
function moment(overrides: Partial<MapMoment> = {}): MapMoment {
  return {
    id: 'm',
    name: 'Moment',
    location: null,
    countryCode: null,
    lat: null,
    lng: null,
    coverPhotoUrl: null,
    dateYear: null,
    dateMonth: null,
    dateDay: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('sortNewestFirst', () => {
  it('orders by tagged date, newest first', () => {
    const older = moment({ id: 'older', dateYear: 2019, dateMonth: 6, dateDay: 1 })
    const newer = moment({ id: 'newer', dateYear: 2023, dateMonth: 1, dateDay: 1 })
    const sorted = sortNewestFirst([older, newer])
    expect(sorted.map((m) => m.id)).toEqual(['newer', 'older'])
  })

  it('falls back to createdAt when no tagged date is present', () => {
    const early = moment({ id: 'early', createdAt: '2021-01-01T00:00:00.000Z' })
    const late = moment({ id: 'late', createdAt: '2022-01-01T00:00:00.000Z' })
    expect(sortNewestFirst([early, late]).map((m) => m.id)).toEqual(['late', 'early'])
  })

  it('ranks a tagged date above a later createdAt for a differently-tagged moment', () => {
    // Tagged 2023 beats tagged 2010 even though the 2010 one was created later.
    const tagged2023 = moment({ id: 'a', dateYear: 2023, createdAt: '2020-01-01T00:00:00.000Z' })
    const tagged2010 = moment({ id: 'b', dateYear: 2010, createdAt: '2024-01-01T00:00:00.000Z' })
    expect(sortNewestFirst([tagged2010, tagged2023]).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input array', () => {
    const input = [moment({ id: 'a', dateYear: 2019 }), moment({ id: 'b', dateYear: 2023 })]
    const before = input.map((m) => m.id)
    sortNewestFirst(input)
    expect(input.map((m) => m.id)).toEqual(before)
  })
})

describe('partitionLocated', () => {
  it('splits moments on presence of coordinates', () => {
    const located = moment({ id: 'here', lat: 40, lng: -3 })
    const noLat = moment({ id: 'noLat', lat: null, lng: -3 })
    const noLng = moment({ id: 'noLng', lat: 40, lng: null })
    const { located: yes, unlocated: no } = partitionLocated([located, noLat, noLng])
    expect(yes.map((m) => m.id)).toEqual(['here'])
    expect(no.map((m) => m.id)).toEqual(['noLat', 'noLng'])
  })

  it('treats a zero coordinate as located (0 is a valid lat/lng)', () => {
    const nullIsland = moment({ id: 'zero', lat: 0, lng: 0 })
    const { located } = partitionLocated([nullIsland])
    expect(located.map((m) => m.id)).toEqual(['zero'])
  })
})

describe('clusterByCountry', () => {
  it('positions a country cluster at the centroid (mean) of its members', () => {
    const a = moment({ id: 'a', countryCode: 'ES', lat: 40, lng: 0 })
    const b = moment({ id: 'b', countryCode: 'ES', lat: 42, lng: 4 })
    const [cluster] = clusterByCountry([a, b])
    expect(cluster.countryCode).toBe('ES')
    expect(cluster.lat).toBeCloseTo(41, 5)
    expect(cluster.lng).toBeCloseTo(2, 5)
    expect(cluster.moments).toHaveLength(2)
  })

  it('groups moments with no country code under a null-country cluster', () => {
    const a = moment({ id: 'a', countryCode: null, lat: 10, lng: 10 })
    const clusters = clusterByCountry([a])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].countryCode).toBeNull()
    expect(clusters[0].key).toBe('country:??')
  })

  it('produces one cluster per distinct country', () => {
    const es = moment({ id: 'es', countryCode: 'ES', lat: 40, lng: 0 })
    const fr = moment({ id: 'fr', countryCode: 'FR', lat: 48, lng: 2 })
    expect(clusterByCountry([es, fr])).toHaveLength(2)
  })
})

describe('clusterByCity', () => {
  it('merges moments that share a coordinate to 3 decimal places', () => {
    const a = moment({ id: 'a', lat: 41.3874, lng: 2.1686 })
    const b = moment({ id: 'b', lat: 41.38742, lng: 2.16861 }) // same to 3dp
    const clusters = clusterByCity([a, b])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].moments).toHaveLength(2)
  })

  it('keeps distinct coordinates in separate clusters', () => {
    const a = moment({ id: 'a', lat: 41.387, lng: 2.168 })
    const b = moment({ id: 'b', lat: 48.856, lng: 2.352 })
    expect(clusterByCity([a, b])).toHaveLength(2)
  })

  it('carries the first member coordinates and country onto the cluster', () => {
    const a = moment({ id: 'a', lat: 41.387, lng: 2.168, countryCode: 'ES' })
    const [cluster] = clusterByCity([a])
    expect(cluster.lat).toBe(41.387)
    expect(cluster.lng).toBe(2.168)
    expect(cluster.countryCode).toBe('ES')
  })
})

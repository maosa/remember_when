import { describe, it, expect } from 'vitest'
import { searchPlaces, getCountryName, getCountry } from '@/lib/places/data'

describe('searchPlaces', () => {
  it('returns nothing for queries shorter than 2 chars', () => {
    expect(searchPlaces('')).toEqual([])
    expect(searchPlaces('b')).toEqual([])
  })

  it('finds a city and labels it "City, Country"', () => {
    const results = searchPlaces('barcelona')
    const barcelona = results.find((r) => r.label === 'Barcelona, Spain')
    expect(barcelona).toBeDefined()
    expect(barcelona!.kind).toBe('city')
    expect(barcelona!.countryCode).toBe('ES')
    expect(barcelona!.lat).toBeCloseTo(41.39, 1)
    expect(barcelona!.lng).toBeCloseTo(2.16, 1)
  })

  it('surfaces the country first when the query matches a country name', () => {
    const results = searchPlaces('spain')
    expect(results[0].kind).toBe('country')
    expect(results[0].label).toBe('Spain')
    // A country result carries capital coordinates (Madrid).
    expect(results[0].lat).toBeCloseTo(40.42, 1)
    // ...followed by Spanish cities.
    const cities = results.filter((r) => r.kind === 'city')
    expect(cities.length).toBeGreaterThan(0)
    expect(cities.every((r) => r.countryCode === 'ES')).toBe(true)
  })

  it('ranks city matches by population (Paris before smaller Paris-named towns)', () => {
    const results = searchPlaces('paris').filter((r) => r.kind === 'city')
    expect(results[0].label.startsWith('Paris, France')).toBe(true)
  })

  it('is diacritic-insensitive', () => {
    const results = searchPlaces('malaga')
    expect(results.some((r) => r.label.startsWith('Málaga'))).toBe(true)
  })

  it('caps results at 20', () => {
    expect(searchPlaces('san').length).toBeLessThanOrEqual(20)
  })

  it('produces unique keys', () => {
    const results = searchPlaces('lond')
    const keys = results.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('country lookups', () => {
  it('resolves a country name and capital from an ISO-2 code', () => {
    expect(getCountryName('ES')).toBe('Spain')
    expect(getCountry('FR')?.name).toBe('France')
    expect(getCountryName('ZZ')).toBeNull()
  })
})

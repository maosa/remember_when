import { describe, it, expect } from 'vitest'
import { resolveCurrency, currencySymbol, formatPrice } from '@/lib/pricing/currency'

describe('resolveCurrency', () => {
  it('maps each listed country to its currency', () => {
    expect(resolveCurrency('US')).toBe('USD')
    expect(resolveCurrency('GB')).toBe('GBP')
    expect(resolveCurrency('JP')).toBe('JPY')
    expect(resolveCurrency('CH')).toBe('CHF')
    expect(resolveCurrency('AU')).toBe('AUD')
    expect(resolveCurrency('CA')).toBe('CAD')
    expect(resolveCurrency('CN')).toBe('CNY')
    expect(resolveCurrency('IN')).toBe('INR')
  })

  it('maps eurozone countries to EUR', () => {
    expect(resolveCurrency('DE')).toBe('EUR')
    expect(resolveCurrency('FR')).toBe('EUR')
    expect(resolveCurrency('HR')).toBe('EUR')
  })

  it('is case-insensitive', () => {
    expect(resolveCurrency('gb')).toBe('GBP')
    expect(resolveCurrency('de')).toBe('EUR')
  })

  it('falls back to USD for unknown, null, undefined, or empty input', () => {
    expect(resolveCurrency('ZZ')).toBe('USD')
    expect(resolveCurrency(null)).toBe('USD')
    expect(resolveCurrency(undefined)).toBe('USD')
    expect(resolveCurrency('')).toBe('USD')
  })
})

describe('formatPrice', () => {
  it('prefixes the symbol before the amount', () => {
    expect(formatPrice(0, 'USD')).toBe('$0')
    expect(formatPrice(0, 'GBP')).toBe('£0')
    expect(formatPrice(0, 'EUR')).toBe('€0')
    expect(formatPrice(0, 'JPY')).toBe('¥0')
    expect(formatPrice(0, 'CNY')).toBe('¥0')
    expect(formatPrice(0, 'INR')).toBe('₹0')
    expect(formatPrice(0, 'AUD')).toBe('A$0')
    expect(formatPrice(0, 'CAD')).toBe('C$0')
  })

  it('keeps the space in the CHF symbol', () => {
    expect(formatPrice(0, 'CHF')).toBe('CHF 0')
  })
})

describe('currencySymbol', () => {
  it('returns the raw symbol including CHF trailing space', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('CHF')).toBe('CHF ')
  })
})

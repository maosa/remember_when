import { describe, it, expect } from 'vitest'
import { isLeapYear, daysInMonth, inferDateMode } from '@/lib/date-helpers'

describe('isLeapYear', () => {
  it('treats years divisible by 4 but not 100 as leap years', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2023)).toBe(false)
  })

  it('treats century years correctly (400 rule)', () => {
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
  })
})

describe('daysInMonth', () => {
  it('returns 31 / 30 for long and short months', () => {
    expect(daysInMonth(1)).toBe(31)
    expect(daysInMonth(4)).toBe(30)
  })

  it('defaults February to 28 when no year is given', () => {
    expect(daysInMonth(2)).toBe(28)
  })

  it('accounts for leap years in February', () => {
    expect(daysInMonth(2, 2024)).toBe(29)
    expect(daysInMonth(2, 2023)).toBe(28)
  })
})

describe('inferDateMode', () => {
  it('returns "full" when a day is present', () => {
    expect(inferDateMode(2024, 6, 15)).toBe('full')
  })

  it('returns "month-year" when month is present but day is not', () => {
    expect(inferDateMode(2024, 6, null)).toBe('month-year')
  })

  it('returns "year" when only the year is present', () => {
    expect(inferDateMode(2024, null, null)).toBe('year')
  })
})

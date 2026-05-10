export type DateMode = 'year' | 'month-year' | 'full'

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const YEARS = Array.from({ length: 3000 - 1900 + 1 }, (_, i) => 1900 + i)

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

/** Returns the number of days in a month. When year is omitted, Feb returns 28 (safe default). */
export function daysInMonth(month: number, year?: number): number {
  if (month === 2) {
    if (year === undefined) return 28
    return isLeapYear(year) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function inferDateMode(year: number | null, month: number | null, day: number | null): DateMode {
  if (day) return 'full'
  if (month) return 'month-year'
  return 'year'
}

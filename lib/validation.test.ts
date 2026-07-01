import { describe, it, expect } from 'vitest'
import { isValidEmail } from '@/lib/validation'

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('first.last@example.com')).toBe(true)
    expect(isValidEmail('  trimmed@example.com  ')).toBe(true)
  })

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('two@@example.com')).toBe(false)
    expect(isValidEmail('spaces in@example.com')).toBe(false)
  })
})

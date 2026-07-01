import { describe, it, expect } from 'vitest'
import {
  safeExt,
  validateAvatarFile,
  validateMediaMimeType,
  mediaTypeFromMime,
} from '@/lib/upload'

describe('safeExt', () => {
  it('maps known MIME types to canonical extensions', () => {
    expect(safeExt('image/jpeg')).toBe('jpg')
    expect(safeExt('video/mp4')).toBe('mp4')
    expect(safeExt('audio/mpeg')).toBe('mp3')
  })

  it('falls back to "bin" for unknown MIME types', () => {
    expect(safeExt('application/x-msdownload')).toBe('bin')
    expect(safeExt('')).toBe('bin')
  })
})

describe('validateAvatarFile', () => {
  const asFile = (type: string) => ({ type }) as File

  it('accepts allowed image types', () => {
    expect(validateAvatarFile(asFile('image/png'))).toBeNull()
  })

  it('rejects disallowed types (e.g. gif, video)', () => {
    expect(validateAvatarFile(asFile('image/gif'))).toMatch(/JPEG, PNG, or WebP/)
    expect(validateAvatarFile(asFile('video/mp4'))).not.toBeNull()
  })
})

describe('validateMediaMimeType', () => {
  it('accepts supported media types', () => {
    expect(validateMediaMimeType('video/webm')).toBeNull()
    expect(validateMediaMimeType('audio/wav')).toBeNull()
  })

  it('rejects unsupported types and names the type in the message', () => {
    expect(validateMediaMimeType('application/pdf')).toMatch(/application\/pdf/)
  })

  it('handles an empty MIME type gracefully', () => {
    expect(validateMediaMimeType('')).toMatch(/unknown/)
  })
})

describe('mediaTypeFromMime', () => {
  it('classifies video, audio, and image MIME types', () => {
    expect(mediaTypeFromMime('video/mp4')).toBe('video')
    expect(mediaTypeFromMime('audio/mpeg')).toBe('audio')
    expect(mediaTypeFromMime('image/png')).toBe('photo')
  })

  it('defaults anything non-video/non-audio to photo', () => {
    expect(mediaTypeFromMime('image/gif')).toBe('photo')
    expect(mediaTypeFromMime('')).toBe('photo')
  })
})

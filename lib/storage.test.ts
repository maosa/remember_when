import { describe, it, expect } from 'vitest'
import { parseBucketPath, getOptimizedUrl } from '@/lib/storage'

describe('parseBucketPath', () => {
  it('splits a "{bucket}/{path}" reference at the first slash', () => {
    expect(parseBucketPath('post-media/moment-uuid/post-uuid/0.jpg')).toEqual({
      bucket: 'post-media',
      path: 'moment-uuid/post-uuid/0.jpg',
    })
  })

  it('returns null when there is no slash', () => {
    expect(parseBucketPath('not-a-path')).toBeNull()
  })
})

describe('getOptimizedUrl', () => {
  it('returns undefined for nullish input', () => {
    expect(getOptimizedUrl(null, 400)).toBeUndefined()
    expect(getOptimizedUrl(undefined, 400)).toBeUndefined()
  })

  it('rewrites a signed URL to the render endpoint with width and quality', () => {
    const url = 'https://x.supabase.co/storage/v1/sign/moment-covers/a/cover.jpg?token=abc'
    const out = getOptimizedUrl(url, 400, 70)!
    expect(out).toContain('/storage/v1/render/image/sign/moment-covers/a/cover.jpg')
    expect(out).toContain('width=400')
    expect(out).toContain('quality=70')
    expect(out).toContain('token=abc')
  })

  it('rewrites a public URL and defaults quality to 80', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u.png'
    const out = getOptimizedUrl(url, 200)!
    expect(out).toContain('/storage/v1/render/image/public/avatars/u.png')
    expect(out).toContain('quality=80')
  })

  it('returns the original string when it is not a valid URL', () => {
    expect(getOptimizedUrl('not a url', 400)).toBe('not a url')
  })
})

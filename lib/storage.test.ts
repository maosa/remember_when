import { describe, it, expect } from 'vitest'
import { parseBucketPath } from '@/lib/storage'

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

'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { PostMedia } from '../actions'

interface MomentGalleryContextValue {
  postMedia: PostMedia[]
  galleryReady: boolean
  registerPostMedia: (items: PostMedia[]) => void
}

const MomentGalleryContext = createContext<MomentGalleryContextValue | null>(null)

export function MomentGalleryProvider({ children }: { children: React.ReactNode }) {
  const [postMedia, setPostMedia] = useState<PostMedia[]>([])
  const [galleryReady, setGalleryReady] = useState(false)

  const registerPostMedia = useCallback((items: PostMedia[]) => {
    setPostMedia(items)
    setGalleryReady(true)
  }, [])

  return (
    <MomentGalleryContext.Provider value={{ postMedia, galleryReady, registerPostMedia }}>
      {children}
    </MomentGalleryContext.Provider>
  )
}

export function useMomentGallery() {
  const ctx = useContext(MomentGalleryContext)
  if (!ctx) throw new Error('useMomentGallery must be used within MomentGalleryProvider')
  return ctx
}

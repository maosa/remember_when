'use client'

import { useState, useTransition } from 'react'
import { ImageIcon, Mic, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/lib/button-variants'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { editPost, type PostWithMedia } from '../actions'

interface Props {
  post: PostWithMedia
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NewPreview = {
  kind: 'new'
  file: File
  objectUrl: string
  mediaType: 'photo' | 'video' | 'audio'
}

type ExistingItem = {
  kind: 'existing'
  id: string
  mediaType: 'photo' | 'video' | 'audio'
  storageUrl: string
  removed: boolean
}

export function EditPostDialog({ post, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState(post.content ?? '')
  const [existing, setExisting] = useState<ExistingItem[]>(() =>
    post.media.map((m) => ({ kind: 'existing', id: m.id, mediaType: m.mediaType, storageUrl: m.storageUrl, removed: false }))
  )
  const [newPreviews, setNewPreviews] = useState<NewPreview[]>([])
  const [error, setError] = useState<string | null>(null)

  // Reset internal state whenever the dialog opens fresh
  function handleOpenChange(val: boolean) {
    if (val) {
      setContent(post.content ?? '')
      setExisting(post.media.map((m) => ({ kind: 'existing', id: m.id, mediaType: m.mediaType, storageUrl: m.storageUrl, removed: false })))
      newPreviews.forEach((p) => URL.revokeObjectURL(p.objectUrl))
      setNewPreviews([])
      setError(null)
    } else {
      newPreviews.forEach((p) => URL.revokeObjectURL(p.objectUrl))
    }
    onOpenChange(val)
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const next: NewPreview[] = []
    for (const file of Array.from(files)) {
      if (file.size > 100 * 1024 * 1024) {
        setError(`${file.name} exceeds the 100 MB limit.`)
        return
      }
      const mediaType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'photo'
      next.push({ kind: 'new', file, objectUrl: URL.createObjectURL(file), mediaType })
    }
    setNewPreviews((prev) => [...prev, ...next])
  }

  function removeExisting(id: string) {
    setExisting((prev) => prev.map((m) => m.id === id ? { ...m, removed: true } : m))
  }

  function removeNew(idx: number) {
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].objectUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('content', content)
      existing.filter((m) => m.removed).forEach((m) => fd.append('removeMediaId', m.id))
      newPreviews.forEach((p) => fd.append('media', p.file))

      const res = await editPost(post.id, post.momentId, fd)
      if (res.error) {
        setError(res.error)
        return
      }
      handleOpenChange(false)
    })
  }

  const visibleExisting = existing.filter((m) => !m.removed)
  const canSubmit = (content.trim().length > 0 || visibleExisting.length > 0 || newPreviews.length > 0) && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>

        <DialogBody className="gap-4">
          <textarea
            placeholder="Write something…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            autoFocus
            className={cn(
              'w-full rounded-rw-input border border-rw-border bg-rw-surface px-2.5 py-2 text-sm outline-none resize-none transition-colors',
              'placeholder:text-rw-text-muted focus-visible:border-rw-accent/60 focus-visible:ring-3 focus-visible:ring-rw-accent/20'
            )}
          />

          {/* Media grid — existing + new previews */}
          {(visibleExisting.length > 0 || newPreviews.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {visibleExisting.map((m) => (
                <div key={m.id} className="relative size-28 sm:size-40 rounded-lg overflow-hidden bg-rw-surface-raised shrink-0">
                  {m.mediaType === 'photo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.storageUrl} alt="" className="size-full object-cover" />
                  )}
                  {m.mediaType === 'video' && (
                    <video src={m.storageUrl} className="size-full object-cover" muted />
                  )}
                  {m.mediaType === 'audio' && (
                    <div className="size-full flex flex-col items-center justify-center gap-2 p-3">
                      <Mic className="size-6 text-rw-text-muted" />
                      <p className="text-xs text-rw-text-muted truncate max-w-full px-1">Audio</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExisting(m.id)}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {newPreviews.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden bg-rw-surface-raised aspect-square ring-2 ring-rw-accent/30">
                  {p.mediaType === 'photo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.objectUrl} alt="" className="size-full object-cover" />
                  )}
                  {p.mediaType === 'video' && (
                    <video src={p.objectUrl} className="size-full object-cover" muted />
                  )}
                  {p.mediaType === 'audio' && (
                    <div className="size-full flex flex-col items-center justify-center gap-2 p-3">
                      <Mic className="size-6 text-rw-text-muted" />
                      <p className="text-xs text-rw-text-muted truncate max-w-full px-1">{p.file.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media picker — label+input approach works reliably inside dialogs */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer')}>
                <input type="file" accept="image/*" multiple className="sr-only"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <ImageIcon className="size-3.5" />
                Photo
              </label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer')}>
                <input type="file" accept="video/*" multiple className="sr-only"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <Video className="size-3.5" />
                Video
              </label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer')}>
                <input type="file" accept="audio/*" multiple className="sr-only"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <Mic className="size-3.5" />
                Audio
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-rw-danger">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

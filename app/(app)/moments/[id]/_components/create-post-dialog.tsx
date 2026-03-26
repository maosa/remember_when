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
import { uploadWithProgress } from '@/lib/upload-with-progress'
import { createPost, preparePostUpload, finalizePostUpload } from '../actions'

interface Props {
  momentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewFile = {
  file: File
  objectUrl: string
  kind: 'photo' | 'video' | 'audio'
}

export function CreatePostDialog({ momentId, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number[] | null>(null)
  const [content, setContent] = useState('')
  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setContent('')
    previews.forEach((p) => URL.revokeObjectURL(p.objectUrl))
    setPreviews([])
    setError(null)
    setUploadProgress(null)
    setIsUploading(false)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const next: PreviewFile[] = []
    for (const file of Array.from(files)) {
      if (file.size > 100 * 1024 * 1024) {
        setError(`${file.name} exceeds the 100 MB limit.`)
        return
      }
      const kind = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'photo'
      next.push({ file, objectUrl: URL.createObjectURL(file), kind })
    }
    setPreviews((prev) => [...prev, ...next])
  }

  function removeFile(idx: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].objectUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function handleSubmit() {
    setError(null)

    if (previews.length === 0) {
      // Text-only post: single server action, no progress tracking needed
      startTransition(async () => {
        const fd = new FormData()
        fd.append('content', content)
        const res = await createPost(momentId, fd)
        if (res.error) { setError(res.error); return }
        onOpenChange(false)
        reset()
      })
      return
    }

    // Posts with media files: two-phase upload with XHR progress
    void handleMediaSubmit()
  }

  async function handleMediaSubmit() {
    setIsUploading(true)
    const progress = new Array<number>(previews.length).fill(0)
    setUploadProgress([...progress])

    // Phase 1: create post record + signed upload URLs
    const prep = await preparePostUpload(
      momentId,
      content.trim() || null,
      previews.map((p, i) => ({ name: p.file.name, type: p.file.type, size: p.file.size, index: i })),
    )

    if (prep.error || !prep.postId || !prep.uploads) {
      setError(prep.error ?? 'Upload preparation failed.')
      setIsUploading(false)
      setUploadProgress(null)
      return
    }

    // Phase 2: XHR-upload each file directly to Storage with progress events
    try {
      await Promise.all(
        prep.uploads.map((u) =>
          uploadWithProgress(u.signedUrl, previews[u.index].file, (pct) => {
            progress[u.index] = pct
            setUploadProgress([...progress])
          }),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setIsUploading(false)
      setUploadProgress(null)
      return
    }

    setIsUploading(false)
    setUploadProgress(null)

    // Phase 3: insert post_media rows + send notifications
    startTransition(async () => {
      const res = await finalizePostUpload(
        prep.postId!,
        momentId,
        prep.uploads!.map((u) => ({ path: u.path, mediaType: u.mediaType })),
      )
      if (res.error) { setError(res.error); return }
      onOpenChange(false)
      reset()
    })
  }

  const overallPct = uploadProgress
    ? Math.round(uploadProgress.reduce((a, b) => a + b, 0) / uploadProgress.length)
    : null

  const isBusy = isPending || isUploading
  const canSubmit = (content.trim().length > 0 || previews.length > 0) && !isBusy

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New entry</DialogTitle>
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

          {/* Media previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative size-28 sm:size-40 rounded-lg overflow-hidden bg-rw-surface-raised shrink-0">
                  {p.kind === 'photo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.objectUrl} alt="" className="size-full object-cover" />
                  )}
                  {p.kind === 'video' && (
                    <video src={p.objectUrl} className="size-full object-cover" muted />
                  )}
                  {p.kind === 'audio' && (
                    <div className="size-full flex flex-col items-center justify-center gap-2 p-3">
                      <Mic className="size-6 text-rw-text-muted" />
                      <p className="text-xs text-rw-text-muted truncate max-w-full px-1">
                        {p.file.name}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={isBusy}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:pointer-events-none"
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
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer', isBusy && 'pointer-events-none opacity-50')}>
                <input type="file" accept="image/*" multiple className="sr-only" disabled={isBusy}
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <ImageIcon className="size-3.5" />
                Photo
              </label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer', isBusy && 'pointer-events-none opacity-50')}>
                <input type="file" accept="video/*" multiple className="sr-only" disabled={isBusy}
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <Video className="size-3.5" />
                Video
              </label>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs cursor-pointer', isBusy && 'pointer-events-none opacity-50')}>
                <input type="file" accept="audio/*" multiple className="sr-only" disabled={isBusy}
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                <Mic className="size-3.5" />
                Audio
              </label>
            </div>
            <span className="text-xs text-rw-text-muted ml-auto">Max 100 MB per file</span>
          </div>

          {error && <p className="text-sm text-rw-danger">{error}</p>}

          {/* Upload progress bar — only visible while XHR uploads are in flight */}
          {overallPct !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-rw-text-muted">
                <span>Uploading…</span>
                <span>{overallPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-rw-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-rw-accent transition-all duration-150 ease-out"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isUploading
              ? `Uploading (${overallPct ?? 0}%)…`
              : isPending
                ? 'Finishing…'
                : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

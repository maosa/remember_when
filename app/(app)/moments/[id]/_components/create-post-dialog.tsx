'use client'

import { useRef, useState, useTransition } from 'react'
import { ImageIcon, Mic, Paperclip, Plus, Video, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createPost } from '../actions'

interface Props {
  momentId: string
}

type PreviewFile = {
  file: File
  objectUrl: string
  kind: 'photo' | 'video' | 'audio'
}

export function CreatePostDialog({ momentId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [previews, setPreviews] = useState<PreviewFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setContent('')
    previews.forEach((p) => URL.revokeObjectURL(p.objectUrl))
    setPreviews([])
    setError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    setOpen(val)
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
    startTransition(async () => {
      const fd = new FormData()
      fd.append('content', content)
      previews.forEach((p) => fd.append('media', p.file))
      const res = await createPost(momentId, fd)
      if (res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      reset()
    })
  }

  const canSubmit = (content.trim().length > 0 || previews.length > 0) && !isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add entry
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <textarea
            placeholder="Write something…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            autoFocus
            className={cn(
              'w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none resize-none transition-colors',
              'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
            )}
          />

          {/* Media previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden bg-muted aspect-square">
                  {p.kind === 'photo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.objectUrl} alt="" className="size-full object-cover" />
                  )}
                  {p.kind === 'video' && (
                    <video src={p.objectUrl} className="size-full object-cover" muted />
                  )}
                  {p.kind === 'audio' && (
                    <div className="size-full flex flex-col items-center justify-center gap-2 p-3">
                      <Mic className="size-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate max-w-full px-1">
                        {p.file.name}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media picker */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*'
                    fileInputRef.current.click()
                  }
                }}
              >
                <ImageIcon className="size-3.5" />
                Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'video/*'
                    fileInputRef.current.click()
                  }
                }}
              >
                <Video className="size-3.5" />
                Video
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'audio/*'
                    fileInputRef.current.click()
                  }
                }}
              >
                <Mic className="size-3.5" />
                Audio
              </Button>
            </div>
            <span className="text-xs text-muted-foreground ml-auto">Max 100 MB per file</span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Posting…' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

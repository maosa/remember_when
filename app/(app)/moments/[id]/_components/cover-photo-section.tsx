'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { updateCoverPhoto, setCoverPhotoFromUrl, fetchMomentPhotos } from '../actions'

interface Props {
  momentId: string
  currentUrl: string | null
  canEdit: boolean
}

export function CoverPhotoSection({ momentId, currentUrl, canEdit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [momentPhotos, setMomentPhotos] = useState<string[] | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  if (!canEdit) return null

  function handleOpenChange(val: boolean) {
    setOpen(val)
    setError(null)
    if (val && momentPhotos === null) {
      setLoadingPhotos(true)
      fetchMomentPhotos(momentId).then(({ urls }) => {
        setMomentPhotos(urls)
        setLoadingPhotos(false)
      })
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.append('cover', file)
    startTransition(async () => {
      const res = await updateCoverPhoto(momentId, fd)
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  function handleSelectExisting(url: string) {
    setError(null)
    startTransition(async () => {
      const res = await setCoverPhotoFromUrl(momentId, url)
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Camera className="size-3.5" />
        {currentUrl ? 'Change cover photo' : 'Add cover photo'}
      </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentUrl ? 'Change cover photo' : 'Add cover photo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Upload from device */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload from device</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            {/* Photos from this moment */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From this moment</p>
              {loadingPhotos && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {!loadingPhotos && momentPhotos !== null && momentPhotos.length === 0 && (
                <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
              )}
              {!loadingPhotos && momentPhotos && momentPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {momentPhotos.map((url) => (
                    <button
                      key={url}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectExisting(url)}
                      className={cn(
                        'relative size-20 rounded-lg overflow-hidden shrink-0 ring-offset-background transition-all',
                        'hover:ring-2 hover:ring-ring hover:ring-offset-2',
                        currentUrl === url && 'ring-2 ring-ring ring-offset-2'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </DialogContent>
    </Dialog>
  )
}

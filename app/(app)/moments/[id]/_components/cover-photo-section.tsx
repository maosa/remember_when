'use client'

import { useState, useTransition } from 'react'
import { Camera, Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/lib/button-variants'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { updateCoverPhoto, setCoverPhotoFromPath, deleteCoverPhoto, fetchMomentPhotos } from '../actions'

interface Props {
  momentId: string
  currentUrl: string | null          // signed URL for display
  currentStoragePath: string | null  // raw storage path for identity comparison
  canEdit: boolean
}

export function CoverPhotoSection({ momentId, currentUrl, currentStoragePath, canEdit }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [momentPhotos, setMomentPhotos] = useState<Array<{ signedUrl: string; storagePath: string }> | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  if (!canEdit) return null

  function handleOpenChange(val: boolean) {
    setOpen(val)
    setError(null)
    if (val && momentPhotos === null) {
      setLoadingPhotos(true)
      fetchMomentPhotos(momentId).then(({ photos }) => {
        setMomentPhotos(photos)
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

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteCoverPhoto(momentId)
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  function handleSelectExisting(storagePath: string) {
    setError(null)
    startTransition(async () => {
      const res = await setCoverPhotoFromPath(momentId, storagePath)
      if (res.error) setError(res.error)
      else setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" aria-label={currentUrl ? 'Edit cover photo' : 'Add cover photo'} />}>
        <Camera className="size-3.5" />
      </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentUrl ? 'Edit cover photo' : 'Add cover photo'}</DialogTitle>
          </DialogHeader>

          <DialogBody>
            {/* Upload from device */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-rw-text-muted uppercase tracking-wide">Upload from device</p>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 cursor-pointer', isPending && 'pointer-events-none opacity-50')}>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  onChange={(e) => { handleFileChange(e); e.target.value = '' }} />
                <Upload className="size-3.5" />
                Choose file
              </label>
            </div>

            {/* Photos from this moment */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-rw-text-muted uppercase tracking-wide">From this moment</p>
              {loadingPhotos && (
                <p className="text-sm text-rw-text-muted">Loading…</p>
              )}
              {!loadingPhotos && momentPhotos !== null && momentPhotos.length === 0 && (
                <p className="text-sm text-rw-text-muted">No photos uploaded yet.</p>
              )}
              {!loadingPhotos && momentPhotos && momentPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {momentPhotos.map((photo) => (
                    <button
                      key={photo.storagePath}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectExisting(photo.storagePath)}
                      className={cn(
                        'relative size-20 rounded-lg overflow-hidden shrink-0 ring-offset-rw-bg transition-all',
                        'hover:ring-2 hover:ring-rw-accent hover:ring-offset-2',
                        currentStoragePath === photo.storagePath && 'ring-2 ring-rw-accent ring-offset-2'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.signedUrl} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete cover photo */}
            {currentUrl && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-rw-text-muted uppercase tracking-wide">Remove</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  <Trash2 className="size-3.5" />
                  Delete cover photo
                </Button>
              </div>
            )}

            {error && <p className="text-sm text-rw-danger">{error}</p>}
          </DialogBody>
        </DialogContent>
    </Dialog>
  )
}

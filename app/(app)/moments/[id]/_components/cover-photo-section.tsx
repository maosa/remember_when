'use client'

import { useEffect, useState, useTransition } from 'react'
import { Camera, Upload, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/lib/button-variants'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { prepareCoverUpload, finalizeCoverUpload, setCoverPhotoFromPath, deleteCoverPhoto, fetchMomentPhotos } from '../actions'
import { MAX_MEDIA_BYTES } from '@/lib/upload'
import { uploadWithProgress } from '@/lib/upload-with-progress'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  momentId: string
  currentUrl: string | null          // signed URL for display
  currentStoragePath: string | null  // raw storage path for identity comparison
  canEdit: boolean
  buttonClassName?: string
}

type MomentPhoto = { signedUrl: string; storagePath: string }

// The pending, not-yet-applied choice. Device uploads are held locally (object
// URL) and only sent to storage on Apply — cancelling or replacing never touches
// the server.
type Selection =
  | null
  | { type: 'existing'; storagePath: string }
  | { type: 'upload'; file: File; objectUrl: string }

export function CoverPhotoSection({ momentId, currentUrl, currentStoragePath, canEdit, buttonClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [momentPhotos, setMomentPhotos] = useState<MomentPhoto[] | null>(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)

  // Revoke a pending upload's object URL whenever the selection moves off it
  // (replace, clear, close) or the component unmounts — prevents memory leaks.
  useEffect(() => {
    if (selection?.type !== 'upload') return
    const url = selection.objectUrl
    return () => URL.revokeObjectURL(url)
  }, [selection])

  if (!canEdit) return null

  // The selection that represents the current cover (used as the initial/"reset"
  // state): the current cover if it's one of the moment's photos, else nothing.
  function currentSelection(photos: MomentPhoto[] | null = momentPhotos): Selection {
    return currentStoragePath && (photos?.some((p) => p.storagePath === currentStoragePath) ?? false)
      ? { type: 'existing', storagePath: currentStoragePath }
      : null
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    setError(null)
    if (val) {
      // Seed the selection from the current cover using cached photos (avoids a
      // ring flash on reopen), then refetch so photos from newly created posts
      // appear without a reload. Skeleton only on first open; otherwise keep the
      // cached grid visible while the fresh list loads in the background.
      setSelection(currentSelection())
      if (momentPhotos === null) setLoadingPhotos(true)
      fetchMomentPhotos(momentId).then(({ photos }) => {
        setMomentPhotos(photos)
        setLoadingPhotos(false)
        // Re-affirm the current-cover pre-selection once photos load, but never
        // clobber a choice the user already made during the refetch.
        setSelection((prev) => prev ?? currentSelection(photos))
      })
    } else {
      // Cancel / X / Esc / backdrop — discard the pending upload + selection.
      setSelection(null)
    }
  }

  function handleChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    // Reject oversized files in the browser before uploading — instant feedback,
    // no wasted upload. The server enforces the same limit as the real guard.
    if (file.size > MAX_MEDIA_BYTES) {
      setError('File must be under 100 MB.')
      return
    }
    // Stage the upload locally; the previous pending upload's URL is revoked by
    // the effect above when the selection changes.
    setSelection({ type: 'upload', file, objectUrl: URL.createObjectURL(file) })
  }

  const hasChange =
    selection?.type === 'upload' ||
    (selection?.type === 'existing' && selection.storagePath !== currentStoragePath)

  function handleApply() {
    if (!selection || !hasChange) return
    setError(null)
    startTransition(async () => {
      let res: { error?: string }
      if (selection.type === 'upload') {
        // Upload the file directly to Storage (Server Actions cap bodies at 1 MB),
        // then point the moment's cover at the uploaded object.
        const file = selection.file
        const prep = await prepareCoverUpload(momentId, { type: file.type, size: file.size })
        if (prep.error || !prep.signedUrl || !prep.path) {
          res = { error: prep.error ?? 'Upload failed.' }
        } else {
          try {
            const { data: { session } } = await createClient().auth.getSession()
            await uploadWithProgress(prep.signedUrl, file, () => {}, session?.access_token, { upsert: true })
            res = await finalizeCoverUpload(momentId, prep.path)
          } catch (err) {
            res = { error: err instanceof Error ? err.message : 'Upload failed.' }
          }
        }
      } else {
        res = await setCoverPhotoFromPath(momentId, selection.storagePath)
      }
      if (res.error) setError(res.error)
      else {
        toast.success('Cover photo updated')
        handleOpenChange(false)
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteCoverPhoto(momentId)
      if (res.error) setError(res.error)
      else {
        toast.success('Cover photo removed')
        handleOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" className={buttonClassName} aria-label={currentUrl ? 'Edit cover photo' : 'Add cover photo'} />}>
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
              {selection?.type === 'upload' ? (
                <div className="flex items-center gap-3">
                  <div className="relative size-20 rounded-lg overflow-hidden shrink-0 ring-2 ring-rw-accent ring-offset-2 ring-offset-rw-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selection.objectUrl} alt="Selected upload" className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove uploaded photo"
                      disabled={isPending}
                      onClick={() => setSelection(currentSelection())}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:pointer-events-none"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                  <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 cursor-pointer', isPending && 'pointer-events-none opacity-50')}>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                      onChange={(e) => { handleChooseFile(e); e.target.value = '' }} />
                    <Upload className="size-3.5" />
                    Replace
                  </label>
                </div>
              ) : (
                <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 cursor-pointer', isPending && 'pointer-events-none opacity-50')}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
                    onChange={(e) => { handleChooseFile(e); e.target.value = '' }} />
                  <Upload className="size-3.5" />
                  Choose file
                </label>
              )}
            </div>

            {/* Photos from this moment */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-rw-text-muted uppercase tracking-wide">From this moment</p>
              {loadingPhotos && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="size-20 rounded-lg bg-rw-surface-raised animate-pulse" />
                  ))}
                </div>
              )}
              {!loadingPhotos && momentPhotos !== null && momentPhotos.length === 0 && (
                <p className="text-sm text-rw-text-muted">No photos uploaded yet.</p>
              )}
              {!loadingPhotos && momentPhotos && momentPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {momentPhotos.map((photo) => {
                    const isSelected = selection?.type === 'existing' && selection.storagePath === photo.storagePath
                    const isCurrent = currentStoragePath === photo.storagePath
                    return (
                      <button
                        key={photo.storagePath}
                        type="button"
                        disabled={isPending}
                        onClick={() => setSelection({ type: 'existing', storagePath: photo.storagePath })}
                        className={cn(
                          'relative size-20 rounded-lg overflow-hidden shrink-0 ring-offset-rw-bg transition-all',
                          'hover:ring-2 hover:ring-rw-accent hover:ring-offset-2',
                          isSelected && 'ring-2 ring-rw-accent ring-offset-2'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.signedUrl} alt="Moment photo" loading="lazy" decoding="async" className="size-full object-cover" />
                        {isCurrent && (
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium leading-none text-white">
                            Current
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-rw-danger">{error}</p>}
          </DialogBody>

          <DialogFooter>
            {currentUrl && (
              <Button
                variant="destructive-outline"
                size="sm"
                className="gap-1.5 mr-auto"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                Delete cover photo
              </Button>
            )}
            <DialogClose render={<Button variant="outline" size="sm" disabled={isPending} />}>
              Cancel
            </DialogClose>
            <Button size="sm" disabled={!hasChange || isPending} onClick={handleApply}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  )
}

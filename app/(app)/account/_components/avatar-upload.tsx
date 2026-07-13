'use client'

import { useState, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { prepareAvatarUpload, finalizeAvatarUpload, removeAvatar } from '../actions'
import { uploadWithProgress } from '@/lib/upload-with-progress'
import { createClient } from '@/lib/supabase/client'

interface Props {
  currentUrl: string | null
  initials: string
}

export function AvatarUpload({ currentUrl, initials }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))

    startTransition(async () => {
      // Upload the file directly to Storage (Server Actions cap bodies at 1 MB),
      // then point the profile photo at the uploaded object.
      const prep = await prepareAvatarUpload({ type: file.type, size: file.size })
      let result: { error?: string }
      if (prep.error || !prep.signedUrl || !prep.path) {
        result = { error: prep.error ?? 'Upload failed.' }
      } else {
        try {
          const { data: { session } } = await createClient().auth.getSession()
          await uploadWithProgress(prep.signedUrl, file, () => {}, session?.access_token, { upsert: true })
          result = await finalizeAvatarUpload(prep.path)
        } catch (err) {
          result = { error: err instanceof Error ? err.message : 'Upload failed.' }
        }
      }

      if (result?.error) {
        toast.error(result.error)
        setPreview(currentUrl)
      } else {
        toast.success('Photo updated.')
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar()
      if (result?.error) {
        toast.error(result.error)
      } else {
        setPreview(null)
        toast.success('Photo removed.')
      }
    })
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-16">
          {preview && <AvatarImage src={preview} alt="Profile photo" />}
          <AvatarFallback className="text-base">{initials}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-rw-accent text-white ring-2 ring-rw-bg transition-opacity hover:opacity-80 disabled:opacity-50"
          aria-label="Change photo"
        >
          <Camera className="size-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Change photo'}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-rw-text-muted">JPG, PNG or WebP · Max 5 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}

'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateCoverPhoto } from '../actions'

interface Props {
  momentId: string
  currentUrl: string | null
  canEdit: boolean
}

export function CoverPhotoSection({ momentId, currentUrl, canEdit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!canEdit) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setMessage(null)
    const formData = new FormData()
    formData.append('cover', file)

    startTransition(async () => {
      const res = await updateCoverPhoto(momentId, formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Cover photo updated.' })
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 border-b">
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          <Camera className="size-3.5" />
          {isPending ? 'Uploading…' : currentUrl ? 'Change cover photo' : 'Add cover photo'}
        </Button>
        {message && (
          <p className={`text-xs ${message.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {message.text}
          </p>
        )}
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

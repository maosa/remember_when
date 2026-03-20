'use client'

import { useState, useRef, useTransition } from 'react'
import { Camera } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { updateAvatar, removeAvatar } from '../actions'

interface Props {
  currentUrl: string | null
  initials: string
}

export function AvatarUpload({ currentUrl, initials }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setMessage(null)

    const formData = new FormData()
    formData.append('avatar', file)

    startTransition(async () => {
      const result = await updateAvatar(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        setPreview(currentUrl)
      } else {
        setMessage({ type: 'success', text: 'Photo updated.' })
      }
    })
  }

  function handleRemove() {
    setMessage(null)
    startTransition(async () => {
      const result = await removeAvatar()
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setPreview(null)
        setMessage({ type: 'success', text: 'Photo removed.' })
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
          className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background transition-opacity hover:opacity-80 disabled:opacity-50"
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
        {message && (
          <p className={`text-xs ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 5 MB</p>
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

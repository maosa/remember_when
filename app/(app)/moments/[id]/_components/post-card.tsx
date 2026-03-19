'use client'

import { useState, useTransition } from 'react'
import { Trash2, Mic } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deletePost, type PostWithMedia } from '../actions'

interface Props {
  post: PostWithMedia
  canDelete: boolean
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PostCard({ post, canDelete }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deletePost(post.id, post.momentId)
      if (res.error) {
        setError(res.error)
      } else {
        setDeleted(true)
      }
    })
  }

  const photos = post.media.filter((m) => m.mediaType === 'photo')
  const videos = post.media.filter((m) => m.mediaType === 'video')
  const audios = post.media.filter((m) => m.mediaType === 'audio')

  return (
    <article className="space-y-3">
      {/* Author row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={post.authorPhotoUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {post.authorFirstName[0]}{post.authorLastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {post.authorFirstName} {post.authorLastName}
            </p>
            <p className="text-xs text-muted-foreground">{formatTimestamp(post.createdAt)}</p>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete post</span>
          </Button>
        )}
      </div>

      {/* Text content */}
      {post.content && (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className={cn(
          'grid gap-1.5 rounded-xl overflow-hidden',
          photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {photos.map((m) => (
            <a key={m.id} href={m.storageUrl} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.storageUrl}
                alt=""
                className={cn(
                  'w-full object-cover bg-muted',
                  photos.length === 1 ? 'max-h-96' : 'aspect-square'
                )}
              />
            </a>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.map((m) => (
        <video
          key={m.id}
          src={m.storageUrl}
          controls
          className="w-full rounded-xl bg-muted max-h-72 object-contain"
        />
      ))}

      {/* Audio */}
      {audios.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-muted/50 px-3 py-2.5">
          <Mic className="size-4 text-muted-foreground shrink-0" />
          <audio src={m.storageUrl} controls className="w-full h-8" />
        </div>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </article>
  )
}

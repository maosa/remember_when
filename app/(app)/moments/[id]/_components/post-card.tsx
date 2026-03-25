'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Mic } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { deletePost, type PostWithMedia } from '../actions'
import { EditPostDialog } from './edit-post-dialog'

interface Props {
  post: PostWithMedia
  canDelete: boolean
  canEdit: boolean
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PostCard({ post, canDelete, canEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Track the post's own mutable state so edits reflect immediately
  const [currentPost, setCurrentPost] = useState(post)

  if (deleted) return null

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deletePost(currentPost.id, currentPost.momentId)
      if (res.error) setError(res.error)
      else setDeleted(true)
    })
  }

  const photos = currentPost.media.filter((m) => m.mediaType === 'photo')
  const videos = currentPost.media.filter((m) => m.mediaType === 'video')
  const audios = currentPost.media.filter((m) => m.mediaType === 'audio')

  return (
    <article className="space-y-3 rounded-rw-card border border-rw-border-subtle bg-rw-surface shadow-rw-card p-5">
      {/* Author row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={currentPost.authorPhotoUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {currentPost.authorFirstName[0]}{currentPost.authorLastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {currentPost.authorFirstName} {currentPost.authorLastName}
            </p>
            <p className="text-xs text-rw-text-muted">
              {formatTimestamp(currentPost.createdAt)}
              {currentPost.editedAt && (
                <span className="ml-1.5">
                  · Edited {formatTimestamp(currentPost.editedAt)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons — only rendered if the user has at least one permission */}
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-0.5 shrink-0">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-rw-text-muted hover:text-rw-text-primary"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit post</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-rw-text-muted hover:text-rw-danger"
                disabled={isPending}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete post</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Text content */}
      {currentPost.content && (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{currentPost.content}</p>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {photos.map((m) => (
            <a key={m.id} href={m.storageUrl} target="_blank" rel="noreferrer" className="block shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.storageUrl}
                alt=""
                className="size-40 rounded-lg object-cover bg-rw-surface-raised"
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
          className="w-full rounded-xl bg-rw-surface-raised max-h-72 object-contain"
        />
      ))}

      {/* Audio */}
      {audios.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-rw-border-subtle bg-rw-surface-raised/50 px-3 py-2.5">
          <Mic className="size-4 text-rw-text-muted shrink-0" />
          <audio src={m.storageUrl} controls className="w-full h-8" />
        </div>
      ))}

      {error && <p className="text-xs text-rw-danger">{error}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <EditPostDialog
          post={currentPost}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(updated) => setCurrentPost(updated)}
        />
      )}
    </article>
  )
}

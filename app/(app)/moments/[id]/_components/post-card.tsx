'use client'

import { memo, useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Pencil, Trash2, Mic, Play } from 'lucide-react'
import { MediaViewer } from './media-viewer'
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

const EditPostDialog = dynamic(() =>
  import('./edit-post-dialog').then((m) => ({ default: m.EditPostDialog }))
)

interface Props {
  post: PostWithMedia
  canDelete: boolean
  canEdit: boolean
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const PostCard = memo(function PostCard({ post, canDelete, canEdit }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editEverOpened, setEditEverOpened] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  // Track the post's own mutable state so edits reflect immediately
  const [currentPost, setCurrentPost] = useState(post)

  // Must be called before any early return — React's rules of hooks require
  // every hook to be called unconditionally on every render.
  const { photos, videos, audios } = useMemo(() => ({
    photos: currentPost.media.filter((m) => m.mediaType === 'photo'),
    videos: currentPost.media.filter((m) => m.mediaType === 'video'),
    audios: currentPost.media.filter((m) => m.mediaType === 'audio'),
  }), [currentPost.media])

  const mediaWithAttribution = useMemo(() =>
    currentPost.media.map((m) => ({
      ...m,
      authorFirstName: currentPost.authorFirstName,
      authorLastName: currentPost.authorLastName,
      postCreatedAt: currentPost.createdAt,
    })),
    [currentPost]
  )

  if (deleted) return null

  function openViewer(mediaId: string) {
    const idx = currentPost.media.findIndex((m) => m.id === mediaId)
    if (idx >= 0) {
      setViewerIndex(idx)
      setViewerOpen(true)
    }
  }

  function handleDelete() {
    // Close the dialog before the async op so Base UI has already torn down
    // its portal by the time setDeleted(true) unmounts this component.
    // Leaving it open causes Base UI to attempt focus-restoration into an
    // unmounted tree, which crashes the page.
    setConfirmOpen(false)
    setError(null)
    startTransition(async () => {
      const res = await deletePost(currentPost.id, currentPost.momentId)
      if (res.error) setError(res.error)
      else setDeleted(true)
    })
  }

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
                onClick={() => { setEditEverOpened(true); setEditOpen(true) }}
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
            <button
              key={m.id}
              onClick={() => openViewer(m.id)}
              className="block shrink-0 rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rw-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.storageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-40 object-cover bg-rw-surface-raised"
              />
            </button>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.map((m) => (
        <button
          key={m.id}
          onClick={() => openViewer(m.id)}
          className="relative w-full rounded-xl overflow-hidden bg-rw-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rw-accent"
        >
          <video
            src={m.storageUrl}
            preload="metadata"
            className="w-full max-h-72 object-contain pointer-events-none"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="size-12 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="size-6 text-white fill-white ml-0.5" />
            </div>
          </div>
        </button>
      ))}

      {/* Audio */}
      {audios.map((m) => (
        <button
          key={m.id}
          onClick={() => openViewer(m.id)}
          className="flex items-center gap-3 w-full text-left rounded-xl border border-rw-border-subtle bg-rw-surface-raised/50 px-3 py-2.5 hover:bg-rw-surface-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rw-accent"
        >
          <Mic className="size-4 text-rw-text-muted shrink-0" />
          <span className="text-sm text-rw-text-muted flex-1">Audio recording</span>
          <Play className="size-3.5 text-rw-text-muted shrink-0" />
        </button>
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

      {canEdit && editEverOpened && (
        <EditPostDialog
          post={currentPost}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(updated) => setCurrentPost(updated)}
        />
      )}

      {viewerOpen && currentPost.media.length > 0 && (
        <MediaViewer
          items={mediaWithAttribution}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </article>
  )
})

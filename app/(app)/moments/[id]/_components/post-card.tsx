'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Mic } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
    <article className="space-y-3 rounded-xl border bg-card p-4">
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
            <p className="text-xs text-muted-foreground">
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
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                <span className="sr-only">Edit post</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
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
                className="size-40 rounded-lg object-cover bg-muted"
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canEdit && (
        <EditPostDialog
          post={currentPost}
          open={editOpen}
          onOpenChange={(val) => {
            setEditOpen(val)
            // Reflect the server revalidation by updating local post state.
            // The full up-to-date post comes back on the next server render;
            // for now we optimistically mark it as edited.
            if (!val && !error) {
              setCurrentPost((p) => ({ ...p, editedAt: new Date().toISOString() }))
            }
          }}
        />
      )}
    </article>
  )
}

'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowDownUp, BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { PostCard } from './post-card'
import type { PostWithMedia } from '../actions'

const CreatePostDialog = dynamic(() =>
  import('./create-post-dialog').then((m) => ({ default: m.CreatePostDialog }))
)

interface Props {
  initialPosts: PostWithMedia[]
  currentUserId: string
  momentOwnerId: string
  momentId: string
  canPost: boolean
  isEditor: boolean
}

type SortOrder = 'asc' | 'desc'

interface Author {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
}

export function PostsFeed({ initialPosts, currentUserId, momentOwnerId, momentId, canPost, isEditor }: Props) {
  const [sort, setSort] = useState<SortOrder>('asc')
  const [filterAuthorId, setFilterAuthorId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createEverOpened, setCreateEverOpened] = useState(false)

  const openCreate = useCallback(() => {
    setCreateEverOpened(true)
    setCreateOpen(true)
  }, [])

  // Collect unique authors from posts
  const authors = useMemo<Author[]>(() => {
    const seen = new Map<string, Author>()
    for (const p of initialPosts) {
      if (!seen.has(p.authorId)) {
        seen.set(p.authorId, {
          id: p.authorId,
          firstName: p.authorFirstName,
          lastName: p.authorLastName,
          photoUrl: p.authorPhotoUrl,
        })
      }
    }
    return Array.from(seen.values())
  }, [initialPosts])

  const sorted = useMemo(() => {
    const filtered = filterAuthorId
      ? initialPosts.filter((p) => p.authorId === filterAuthorId)
      : initialPosts
    return sort === 'asc' ? filtered : [...filtered].reverse()
  }, [initialPosts, sort, filterAuthorId])

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-semibold mr-auto">Entries</h2>

        {/* Sort toggle */}
        {initialPosts.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-rw-text-muted"
            onClick={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
          >
            <ArrowDownUp className="size-3.5" />
            {sort === 'asc' ? 'Oldest first' : 'Newest first'}
          </Button>
        )}

        {/* Add entry button */}
        {canPost && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="size-4" />
            Add entry
          </Button>
        )}
      </div>

      {/* Author filter chips */}
      {authors.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterAuthorId(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filterAuthorId === null
                ? 'bg-rw-text-primary text-rw-bg border-rw-text-primary'
                : 'bg-transparent text-rw-text-muted hover:text-rw-text-primary hover:border-rw-text-primary'
            )}
          >
            Everyone
          </button>
          {authors.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setFilterAuthorId(a.id === filterAuthorId ? null : a.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border pl-1.5 pr-3 py-1 text-xs font-medium transition-colors',
                filterAuthorId === a.id
                  ? 'bg-rw-text-primary text-rw-bg border-rw-text-primary'
                  : 'bg-transparent text-rw-text-muted hover:text-rw-text-primary hover:border-rw-text-primary'
              )}
            >
              <Avatar className="size-4">
                <AvatarImage src={a.photoUrl ?? undefined} />
                <AvatarFallback className="text-[8px]">{a.firstName[0]}{a.lastName[0]}</AvatarFallback>
              </Avatar>
              {a.firstName}
            </button>
          ))}
        </div>
      )}

      {/* Post list */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No entries yet"
          description={canPost ? 'Be the first to add an entry to this moment.' : 'Entries will appear here.'}
          action={canPost ? (
            <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
              <Plus className="size-4" />
              Add entry
            </Button>
          ) : undefined}
          className="py-16"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={post.authorId === currentUserId || momentOwnerId === currentUserId || isEditor}
              canEdit={post.authorId === currentUserId}
            />
          ))}
        </div>
      )}

      {canPost && createEverOpened && (
        <CreatePostDialog
          momentId={momentId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </div>
  )
}

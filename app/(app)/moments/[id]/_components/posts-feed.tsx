'use client'

import { useMemo, useState } from 'react'
import { ArrowDownUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { PostCard } from './post-card'
import { CreatePostDialog } from './create-post-dialog'
import type { PostWithMedia } from '../actions'

interface Props {
  initialPosts: PostWithMedia[]
  currentUserId: string
  momentOwnerId: string
  momentId: string
  canPost: boolean
}

type SortOrder = 'asc' | 'desc'

interface Author {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
}

export function PostsFeed({ initialPosts, currentUserId, momentOwnerId, momentId, canPost }: Props) {
  const [sort, setSort] = useState<SortOrder>('asc')
  const [filterAuthorId, setFilterAuthorId] = useState<string | null>(null)

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
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
          >
            <ArrowDownUp className="size-3.5" />
            {sort === 'asc' ? 'Oldest first' : 'Newest first'}
          </Button>
        )}

        {/* Add entry button */}
        {canPost && <CreatePostDialog momentId={momentId} />}
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
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground'
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
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground'
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
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-sm text-muted-foreground">
              {canPost ? 'Be the first to add an entry to this moment.' : 'Entries will appear here.'}
            </p>
          </div>
          {canPost && <CreatePostDialog momentId={momentId} />}
        </div>
      ) : (
        <div className="space-y-8">
          {sorted.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                canDelete={post.authorId === currentUserId || momentOwnerId === currentUserId}
                canEdit={post.authorId === currentUserId}
              />
              <div className="mt-8 border-b last:hidden" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

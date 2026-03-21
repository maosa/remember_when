import { Lock } from 'lucide-react'
import { fetchPosts } from '../actions'
import { PostsFeed } from './posts-feed'

interface Props {
  momentId: string
  momentOwnerId: string
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
}

// Blurred placeholder shown to pending invitees instead of real posts
function LockedPostsPlaceholder() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="relative select-none pointer-events-none" aria-hidden>
        {/* Fake post cards */}
        {[80, 56, 96].map((h, i) => (
          <div
            key={i}
            className="mb-4 rounded-xl border bg-muted/40 p-4 blur-sm"
            style={{ height: `${h}px` }}
          />
        ))}
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Lock className="size-6 opacity-60" />
          <p className="text-sm font-medium">Accept the invite to see posts</p>
        </div>
      </div>
    </section>
  )
}

export async function PostsSection({ momentId, momentOwnerId, myRole, myStatus }: Props) {
  // Don't fetch or show real posts until the invite is accepted
  if (myStatus === 'pending') return <LockedPostsPlaceholder />

  const { posts, currentUserId } = await fetchPosts(momentId)

  const canPost = myStatus === 'accepted' && myRole !== 'reader'
  const isEditor = myStatus === 'accepted' && myRole === 'editor'

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <PostsFeed
        initialPosts={posts}
        currentUserId={currentUserId ?? ''}
        momentOwnerId={momentOwnerId}
        momentId={momentId}
        canPost={canPost}
        isEditor={isEditor}
      />
    </section>
  )
}

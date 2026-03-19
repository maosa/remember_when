import { fetchPosts } from '../actions'
import { PostsFeed } from './posts-feed'

interface Props {
  momentId: string
  momentOwnerId: string
  canPost: boolean
}

export async function PostsSection({ momentId, momentOwnerId, canPost }: Props) {
  const { posts, currentUserId } = await fetchPosts(momentId)

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <PostsFeed
        initialPosts={posts}
        currentUserId={currentUserId ?? ''}
        momentOwnerId={momentOwnerId}
        momentId={momentId}
        canPost={canPost}
      />
    </section>
  )
}

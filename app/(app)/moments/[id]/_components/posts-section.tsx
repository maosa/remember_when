import { fetchPosts } from '../actions'
import { PostsFeed } from './posts-feed'

interface Props {
  momentId: string
  momentOwnerId: string
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
}

export async function PostsSection({ momentId, momentOwnerId, myRole, myStatus }: Props) {
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

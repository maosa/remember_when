import { notFound } from 'next/navigation'
import { fetchMomentDetail } from './actions'
import { MomentHeader } from './_components/moment-header'
import { CoverPhotoSection } from './_components/cover-photo-section'
import { TagsSection } from './_components/tags-section'
import { MembersRow } from './_components/members-row'
import { PostsSection } from './_components/posts-section'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MomentPage({ params }: Props) {
  const { id } = await params
  const { moment, myRole, myStatus, error } = await fetchMomentDetail(id)

  if (error || !moment || !myRole || !myStatus) notFound()

  const canEdit = myStatus === 'accepted' && (myRole === 'owner' || myRole === 'editor')

  return (
    <main className="min-h-screen">
      {/* Collapsing header + invite banner */}
      <MomentHeader moment={moment} myRole={myRole} myStatus={myStatus} />

      {/* Cover photo management (accepted editors/owner only) */}
      <CoverPhotoSection
        momentId={moment.id}
        currentUrl={moment.coverPhotoUrl}
        canEdit={canEdit}
      />

      {/* Tags */}
      <TagsSection
        momentId={moment.id}
        tags={moment.tags}
        canEdit={canEdit}
      />

      {/* Members row */}
      <MembersRow moment={moment} myRole={myRole} myStatus={myStatus} />

      {/* Posts & media */}
      <PostsSection
        momentId={moment.id}
        momentOwnerId={moment.ownerId}
        myRole={myRole}
        myStatus={myStatus}
      />
    </main>
  )
}

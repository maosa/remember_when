import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { fetchMomentDetail } from './actions'
import { MomentHeader } from './_components/moment-header'
import { TagsSection } from './_components/tags-section'
import { MembersRow } from './_components/members-row'
import { PostsSection } from './_components/posts-section'

function PostsSectionSkeleton() {
  return (
    <section className="mx-auto max-w-[720px] px-4 md:px-6 py-10 space-y-3">
      <div className="h-5 w-20 rounded-md bg-rw-surface-raised animate-pulse" />
      {[100, 72, 120].map((h, i) => (
        <div
          key={i}
          className="rounded-rw-card border border-rw-border-subtle bg-rw-surface animate-pulse"
          style={{ height: `${h}px` }}
        />
      ))}
    </section>
  )
}

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

      {/* Tags */}
      <TagsSection
        momentId={moment.id}
        tags={moment.tags}
        canEdit={canEdit}
      />

      {/* Members row + action buttons */}
      <MembersRow moment={moment} myRole={myRole} myStatus={myStatus} canEdit={canEdit} />

      {/* Posts & media — streamed independently so header/tags/members appear first */}
      <Suspense fallback={<PostsSectionSkeleton />}>
        <PostsSection
          momentId={moment.id}
          momentOwnerId={moment.ownerId}
          myRole={myRole}
          myStatus={myStatus}
        />
      </Suspense>
    </main>
  )
}

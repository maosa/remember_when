import { notFound } from 'next/navigation'
import { fetchMomentDetail } from './actions'
import { MomentHeader } from './_components/moment-header'
import { CoverPhotoSection } from './_components/cover-photo-section'
import { TagsSection } from './_components/tags-section'
import { MembersSection } from './_components/members-section'
import { BookOpen } from 'lucide-react'

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

      {/* Members */}
      <MembersSection moment={moment} myRole={myRole} myStatus={myStatus} />

      {/* Journal entries — placeholder for Phase 5 */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-sm text-muted-foreground">
              Journal entries and photos will appear here.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

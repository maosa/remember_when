import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { fetchMomentDetail } from '../actions'
import { MembersSection } from '../_components/members-section'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MomentMembersPage({ params }: Props) {
  const { id } = await params
  const { moment, myRole, myStatus, myUserId, error } = await fetchMomentDetail(id)

  if (error || !moment || !myRole || !myStatus || !myUserId) notFound()

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <Link
            href={`/moments/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            aria-label="Back to moment"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-semibold">Moment Settings</h1>
        </div>

        <MembersSection
          moment={moment}
          myRole={myRole}
          myStatus={myStatus}
          myUserId={myUserId}
        />

      </div>
    </main>
  )
}

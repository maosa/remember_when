import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ChevronLeft, MapPin } from 'lucide-react'
import { fetchMomentDetail } from '../actions'
import { MembersSection } from '../_components/members-section'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'
import { formatMomentDate } from '@/lib/date-helpers'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MomentMembersPage({ params }: Props) {
  const { id } = await params
  const { moment, myRole, myStatus, myUserId, error } = await fetchMomentDetail(id)

  if (error || !moment || !myRole || !myStatus || !myUserId) notFound()

  const date = formatMomentDate(moment.dateYear, moment.dateMonth, moment.dateDay)

  return (
    <main className="min-h-screen bg-rw-bg">
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-8 space-y-6">

        <div className="flex items-start gap-3">
          <Link
            href={`/moments/${id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0')}
            aria-label="Back to moment"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold">Moment Settings</h1>
            {/* Which moment these settings belong to: name, date, location.
                Icons separate the items (as in the moment header), so wrapping
                on narrow screens never leaves a dangling separator. */}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-rw-text-muted">
              <span className="font-medium text-rw-text-primary break-words min-w-0">{moment.name}</span>
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0" />
                  {date}
                </span>
              )}
              {moment.location && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="size-3.5 shrink-0" />
                  {moment.location}
                </span>
              )}
            </p>
          </div>
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

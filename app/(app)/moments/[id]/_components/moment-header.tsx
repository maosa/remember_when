'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, CheckCircle2, XCircle, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { acceptMomentInvite, declineMomentInvite, type MomentDetail, type PostMedia } from '../actions'
import { MediaViewer } from './media-viewer'
import { useMomentGallery } from './moment-gallery-context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(year: number | null, month: number | null, day: number | null): string | null {
  if (!year) return null
  if (!month) return String(year)
  const m = MONTHS_SHORT[month - 1]
  if (!day) return `${m} ${year}`
  return `${m} ${day}, ${year}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  moment: MomentDetail
  myRole: 'owner' | 'editor' | 'reader'
  myStatus: 'pending' | 'accepted' | 'declined'
}

export function MomentHeader({ moment, myRole, myStatus }: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const { postMedia, galleryReady } = useMomentGallery()

  const date = formatDate(moment.dateYear, moment.dateMonth, moment.dateDay)
  const isPendingInvite = myStatus === 'pending'

  // Cover photo as item 0, then all post media in chronological order
  const galleryItems = useMemo<PostMedia[]>(() => {
    if (!moment.coverPhotoUrl) return postMedia
    return [
      { id: 'moment-cover', mediaType: 'photo', storageUrl: moment.coverPhotoUrl },
      ...postMedia,
    ]
  }, [moment.coverPhotoUrl, postMedia])

  const coverClickable = galleryReady && !isPendingInvite && !!moment.coverPhotoUrl

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' } // 56px = desktop nav height
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  function handleAccept() {
    setInviteError(null)
    startTransition(async () => {
      const res = await acceptMomentInvite(moment.id)
      if (res.error) { setInviteError(res.error); return }
      // Refresh the server component so myStatus becomes 'accepted',
      // removing the banner and unblurring content without a full navigation.
      router.refresh()
    })
  }

  function handleDecline() {
    setInviteError(null)
    startTransition(async () => {
      const res = await declineMomentInvite(moment.id)
      if (res.error) { setInviteError(res.error); return }
      router.push('/home')
    })
  }

  return (
    <>
      {/* ── Collapsed sticky bar ──────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-x-0 z-40 h-12 border-b border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm transition-all duration-200 ease-in-out',
          'shadow-[0_1px_0_rgba(44,42,37,0.08),_0_2px_12px_rgba(44,42,37,0.06)]',
          'top-0 md:top-14',
          collapsed
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="mx-auto max-w-[720px] px-4 md:px-6 h-full flex items-center gap-2">
          <h1 className="font-serif font-normal text-base truncate flex-1">{moment.name}</h1>
        </div>
      </div>

      {/* ── Full expanded header ───────────────────────────────── */}
      <div className="relative">
        {/* Cover photo */}
        {moment.coverPhotoUrl ? (
          <div
            className={cn(
              'relative h-52 sm:h-72 overflow-hidden bg-rw-surface-raised group',
              coverClickable && 'cursor-pointer'
            )}
            onClick={coverClickable ? () => setGalleryOpen(true) : undefined}
            role={coverClickable ? 'button' : undefined}
            tabIndex={coverClickable ? 0 : undefined}
            onKeyDown={coverClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGalleryOpen(true) } } : undefined}
            aria-label={coverClickable ? 'View moment gallery' : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={moment.coverPhotoUrl}
              alt={moment.name}
              fetchPriority="high"
              decoding="async"
              className={cn('size-full object-cover', isPendingInvite && 'blur-md scale-110')}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44,42,37,0.75) 0%, rgba(44,42,37,0.3) 50%, transparent 100%)' }} />
            {coverClickable && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full bg-black/40 p-2.5">
                  <ZoomIn className="size-5 text-white" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-br from-rw-accent-subtle via-rw-surface-raised to-rw-surface" />
        )}

        {/* Moment info */}
        <div
          className={cn(
            'px-4 md:px-6 pb-3',
            moment.coverPhotoUrl
              ? 'absolute inset-x-0 bottom-0'
              : 'pt-6'
          )}
        >
          <div className="mx-auto max-w-[720px] space-y-3">
            {/* Name + edit menu (no-cover case only) */}
            <div className="flex items-start gap-2">
              <h1
                className={cn(
                  'text-2xl sm:text-3xl font-normal leading-tight flex-1',
                  moment.coverPhotoUrl && 'text-white'
                )}
                style={moment.coverPhotoUrl ? { textShadow: '0 1px 4px rgba(44,42,37,0.5)' } : undefined}
              >
                {moment.name}
              </h1>
            </div>

            {/* Meta */}
            <div
              className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm',
                moment.coverPhotoUrl ? 'text-white/90' : 'text-rw-text-muted'
              )}
              style={moment.coverPhotoUrl ? { textShadow: '0 1px 4px rgba(44,42,37,0.5)' } : undefined}
            >
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0" />
                  {date}
                </span>
              )}
              {moment.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {moment.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sentinel — when this scrolls out of view the collapsed bar appears */}
      <div ref={sentinelRef} className="h-px" />

      {/* Moment gallery viewer — opens from cover photo click */}
      {galleryOpen && galleryItems.length > 0 && (
        <MediaViewer
          items={galleryItems}
          initialIndex={0}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {/* ── Pending invite banner ──────────────────────────────── */}
      {isPendingInvite && (
        <div className="mx-auto max-w-[720px] px-4 md:px-6 py-4">
          <div className="rounded-xl border border-rw-accent/20 bg-rw-accent-subtle/40 p-4 space-y-3">
            <div className="space-y-1">
              <p className="font-medium text-sm">You've been invited to this moment</p>
              <p className="text-sm text-rw-text-muted">
                Invited by {moment.ownerFirstName} {moment.ownerLastName}
              </p>
            </div>
            {inviteError && <p className="text-sm text-rw-danger">{inviteError}</p>}
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending} onClick={handleAccept}>
                <CheckCircle2 className="size-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={handleDecline}>
                <XCircle className="size-3.5" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Camera, ChevronLeft, ChevronRight, Download, Mic,
  Pause, Play, SkipBack, SkipForward, Video as VideoIcon, X,
} from 'lucide-react'
import type { PostMedia } from '../actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seededBars(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return Array.from({ length: count }, () => {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0
    h ^= h >>> 16
    return 0.1 + (Math.abs(h & 0xffff) / 0xffff) * 0.9
  })
}

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaViewerProps {
  items: PostMedia[]
  initialIndex: number
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const WAVEFORM_BARS = 70

export function MediaViewer({
  items,
  initialIndex,
  onClose,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [itemKey, setItemKey] = useState(0)
  const [visible, setVisible] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)

  // Audio state
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)

  // Photo zoom
  const [photoScale, setPhotoScale] = useState(1)

  // Refs
  const closingRef = useRef(false)
  const isTouchRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const pinchDistRef = useRef<number | null>(null)

  // Stable refs so keyboard handler doesn't need to re-register
  const navigateRef = useRef<(dir: number) => void>(() => {})
  const handleCloseRef = useRef<() => void>(() => {})

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── Animate in on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Controls auto-hide ───────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isTouchRef.current) return
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  // ── Wheel zoom (must be non-passive to preventDefault) ──────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (items[currentIndex]?.mediaType === 'photo') {
        setPhotoScale(s => Math.min(3, Math.max(1, s - e.deltaY * 0.002)))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [currentIndex, items])

  // ── Navigate function (kept fresh via ref) ───────────────────────────────
  const navigate = useCallback((dir: number) => {
    const next = currentIndex + dir
    if (next < 0 || next >= items.length) return
    videoRef.current?.pause()
    audioRef.current?.pause()
    setCurrentIndex(next)
    setItemKey(k => k + 1)
    setAudioTime(0)
    setAudioDuration(0)
    setAudioPlaying(false)
    setPhotoScale(1)
    resetHideTimer()
  }, [currentIndex, items.length, resetHideTimer])

  navigateRef.current = navigate

  // ── Close function (kept fresh via ref) ──────────────────────────────────
  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(onClose, prefersReducedMotion ? 0 : 200)
  }, [onClose, prefersReducedMotion])

  handleCloseRef.current = handleClose

  // ── Keyboard handler (registered once) ───────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRef.current()
      else if (e.key === 'ArrowLeft') navigateRef.current(-1)
      else if (e.key === 'ArrowRight') navigateRef.current(1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Touch handlers ───────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    isTouchRef.current = true
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
      pinchDistRef.current = null
    } else if (e.touches.length === 2) {
      touchStartXRef.current = null
      pinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (items[currentIndex]?.mediaType === 'photo') {
        setPhotoScale(s => Math.min(3, Math.max(1, s * (d / pinchDistRef.current!))))
      }
      pinchDistRef.current = d
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current !== null && e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartXRef.current
      const dy = Math.abs(e.changedTouches[0].clientY - (touchStartYRef.current ?? 0))
      if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
        navigateRef.current(dx < 0 ? 1 : -1)
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const item = items[currentIndex]
  if (!item) return null

  const bars = item.mediaType === 'audio' ? seededBars(item.id, WAVEFORM_BARS) : []
  const playheadPct = audioDuration > 0 ? (audioTime / audioDuration) * 100 : 0
  const TypeIcon = { photo: Camera, video: VideoIcon, audio: Mic }[item.mediaType]
  const typeLabel = { photo: 'Photo', video: 'Video', audio: 'Audio' }[item.mediaType]
  const animDur = prefersReducedMotion ? 0 : 200

  const content = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center select-none"
      style={{
        backgroundColor: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(4px)',
        opacity: visible ? 1 : 0,
        transition: animDur ? `opacity ${animDur}ms ease` : 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleCloseRef.current() }}
      onMouseMove={resetHideTimer}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Keyframe for item fade-in on navigation */}
      <style>{`@keyframes rwViewerFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {/* ── Media item ─────────────────────────────────────────────────────── */}
      <div
        key={itemKey}
        className="relative flex items-center justify-center"
        style={{
          maxWidth: '90vw',
          maxHeight: '85dvh',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: animDur ? `transform ${animDur}ms ease` : 'none',
          animation: itemKey > 0 && !prefersReducedMotion
            ? 'rwViewerFadeIn 150ms ease'
            : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        {item.mediaType === 'photo' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.storageUrl}
            alt=""
            draggable={false}
            style={{
              maxWidth: '90vw',
              maxHeight: '85dvh',
              objectFit: 'contain',
              transform: `scale(${photoScale})`,
              transformOrigin: 'center center',
              transition: prefersReducedMotion ? 'none' : 'transform 150ms ease',
              userSelect: 'none',
              display: 'block',
              borderRadius: 8,
            }}
          />
        )}

        {/* Video */}
        {item.mediaType === 'video' && (
          <video
            ref={videoRef}
            src={item.storageUrl}
            controls
            muted
            preload="metadata"
            style={{
              maxWidth: '90vw',
              maxHeight: '85dvh',
              objectFit: 'contain',
              borderRadius: 8,
              backgroundColor: '#000',
              display: 'block',
            }}
          />
        )}

        {/* Audio */}
        {item.mediaType === 'audio' && (
          <>
            <audio
              ref={audioRef}
              src={item.storageUrl}
              preload="metadata"
              onTimeUpdate={() => setAudioTime(audioRef.current?.currentTime ?? 0)}
              onDurationChange={() => setAudioDuration(audioRef.current?.duration ?? 0)}
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => setAudioPlaying(false)}
            />
            <div
              style={{
                width: 'min(520px, 90vw)',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#1c1c1e',
              }}
            >
              <div style={{ padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Waveform */}
                <div style={{ position: 'relative', height: 80 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h * 100}%`,
                          borderRadius: 2,
                          backgroundColor: i / WAVEFORM_BARS <= playheadPct / 100
                            ? '#5C7A6B'
                            : 'rgba(255,255,255,0.15)',
                        }}
                      />
                    ))}
                  </div>
                  {/* Playhead */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      width: 2,
                      borderRadius: 1,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      left: `${playheadPct}%`,
                      transition: prefersReducedMotion ? 'none' : 'left 200ms linear',
                    }}
                  />
                </div>

                {/* Timestamp */}
                <div style={{ textAlign: 'center', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.5)' }}>
                  {fmtTime(audioTime)} / {fmtTime(audioDuration)}
                </div>

                {/* Playback controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                  <button
                    aria-label="Skip back 10 seconds"
                    style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10) }}
                  >
                    <SkipBack size={20} />
                  </button>
                  <button
                    aria-label={audioPlaying ? 'Pause' : 'Play'}
                    style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#5C7A6B', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      if (!audioRef.current) return
                      audioPlaying ? audioRef.current.pause() : audioRef.current.play()
                    }}
                  >
                    {audioPlaying
                      ? <Pause size={24} fill="white" />
                      : <Play size={24} fill="white" style={{ marginLeft: 2 }} />
                    }
                  </button>
                  <button
                    aria-label="Skip forward 10 seconds"
                    style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}
                    onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 10) }}
                  >
                    <SkipForward size={20} />
                  </button>
                </div>

                {/* Author / date */}
                {item.authorFirstName && item.postCreatedAt && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                    {item.authorFirstName} {item.authorLastName} · {fmtDate(item.postCreatedAt)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Controls overlay ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: controlsVisible ? 1 : 0.6,
          transition: isTouchRef.current ? 'none' : 'opacity 300ms ease',
        }}
      >
        {/* Type + position pill — top left */}
        <div
          className="absolute top-4 left-4 pointer-events-auto"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <TypeIcon size={12} />
          {typeLabel} · {currentIndex + 1} / {items.length}
        </div>

        {/* Top-right: download (photo only) + close */}
        <div className="absolute top-3 right-3 flex items-center pointer-events-auto">
          {item.mediaType === 'photo' && (
            <a
              href={item.storageUrl}
              download
              aria-label="Download photo"
              style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', borderRadius: '50%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={20} />
            </a>
          )}
          <button
            aria-label="Close viewer"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}
            onClick={() => handleCloseRef.current()}
          >
            <X size={20} />
          </button>
        </div>

        {/* Left nav arrow */}
        {currentIndex > 0 && (
          <button
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }}
            onClick={() => navigateRef.current(-1)}
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {/* Right nav arrow */}
        {currentIndex < items.length - 1 && (
          <button
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }}
            onClick={() => navigateRef.current(1)}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(content, document.body)
}

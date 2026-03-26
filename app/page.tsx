'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Plus, PenLine, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Rotating hero quote ──────────────────────────────────────────────────────

const HERO_QUOTES = [
  "you laughed so hard you couldn\u2019t breathe.",
  "you couldn\u2019t stop smiling for the rest of the day.",
  "everything just clicked and felt right.",
  "you didn\u2019t want the night to end.",
  "you all sang along at the exact same moment.",
  "someone did something so stupid it became legendary.",
  "everyone was in the same place at the same time.",
  "the whole group was finally together again.",
  "you looked around and thought, I love these people.",
  "you stayed way longer than you planned.",
  "nobody wanted to be the first to leave.",
  "you said \u2018we should do this more often.\u2019",
  "that trip went completely off-script.",
  "you got lost and it turned into the best day.",
  "the plan fell apart and something better happened.",
  "you all agreed it was the best decision you\u2019d ever made.",
  "none of you were ready to go home.",
  "nothing special happened, but it was perfect.",
  "time slowed down for a little while.",
  "you wished you could press pause.",
  "the conversation went on for hours.",
  "it felt like no time had passed at all.",
  "you all celebrated like it was the biggest deal in the world.",
  "someone did the thing they said they\u2019d never do.",
  "you pulled it off against all odds.",
  "the hard part was finally over.",
  "you looked at each other and just knew.",
  "everything went wrong in the best possible way.",
  "you still can\u2019t tell the story without laughing.",
  "someone said something that became an inside joke forever.",
  "nobody can agree on exactly what happened, but it was brilliant.",
] as const

function shuffleIndices(len: number): number[] {
  const a = Array.from({ length: len }, (_, i) => i)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const QUOTE_DISPLAY_MS = 4000
const QUOTE_FADE_MS    = 600

const QUOTE_MARK_STYLE: React.CSSProperties = {
  color: 'rgba(200,152,64,0.5)',
  fontSize: '1.05em',
}

function RotatingQuote() {
  const [shownIdx, setShownIdx] = useState(0)
  const [visible,  setVisible]  = useState(true)
  const queueRef   = useRef<number[]>([])
  const posRef     = useRef(0)
  const reducedRef = useRef(false)

  // One-time: detect reduced motion + pick random starting quote
  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const queue = shuffleIndices(HERO_QUOTES.length)
    const start = Math.floor(Math.random() * queue.length)
    queueRef.current = queue
    posRef.current   = start
    setShownIdx(queue[start])
  }, [])

  // Cycling loop — runs once, uses refs for all mutable state
  useEffect(() => {
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []
    const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0 }

    function nextIdx(): number {
      posRef.current += 1
      if (posRef.current >= queueRef.current.length) {
        queueRef.current = shuffleIndices(HERO_QUOTES.length)
        posRef.current   = 0
      }
      return queueRef.current[posRef.current]
    }

    function tick() {
      if (!alive) return
      timers.push(setTimeout(() => {
        if (!alive) return
        if (reducedRef.current) {
          setShownIdx(nextIdx())
          tick()
        } else {
          setVisible(false)
          timers.push(setTimeout(() => {
            if (!alive) return
            setShownIdx(nextIdx())
            setVisible(true)
            tick()
          }, QUOTE_FADE_MS))
        }
      }, QUOTE_DISPLAY_MS))
    }

    function onVisibility() {
      if (document.hidden) {
        clearAll()
        setVisible(true) // snap back if paused mid-fade
      } else if (alive) {
        tick()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    tick()

    return () => {
      alive = false
      clearAll()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <span
      style={{
        opacity:    visible ? 1 : 0,
        transition: `opacity ${QUOTE_FADE_MS}ms ease`,
      }}
    >
      {HERO_QUOTES[shownIdx]}
    </span>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────

const TRIO_ITEMS = [
  {
    num: '01',
    iconClass: 'bg-rw-accent-subtle text-rw-accent',
    icon: <Plus className="size-[18px]" strokeWidth={1.7} />,
    title: 'Capture the moment',
    body: "Give the moment a name, a date, a place. Then invite the people who were actually there — the ones who'll remember it the same way you do.",
  },
  {
    num: '02',
    iconClass: 'bg-[rgba(200,152,64,0.10)] text-[#C89840]',
    icon: <PenLine className="size-[18px]" strokeWidth={1.7} />,
    title: 'Write it together',
    body: "Everyone adds their own piece — photos, stories, the small details only they noticed. No single perspective owns the memory.",
  },
  {
    num: '03',
    iconClass: 'bg-[rgba(107,106,192,0.10)] text-[#6B6AC0]',
    icon: <Heart className="size-[18px]" strokeWidth={1.7} />,
    title: 'Keep it forever',
    body: "Your moments live here — private, permanent, and waiting whenever you want to go back. No algorithm decides what you see or don't.",
  },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled,    setScrolled]    = useState(false)
  const [trioVisible, setTrioVisible] = useState<boolean[]>([false, false, false])
  const [ctaVisible,  setCtaVisible]  = useState(false)

  // Individual trio refs (hook rules: no refs in arrays)
  const trioRef0 = useRef<HTMLDivElement>(null)
  const trioRef1 = useRef<HTMLDivElement>(null)
  const trioRef2 = useRef<HTMLDivElement>(null)
  const ctaRef   = useRef<HTMLDivElement>(null)

  // Nav: becomes opaque when scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Trio columns + CTA: scroll-reveal via IntersectionObserver
  useEffect(() => {
    const trioRefs = [trioRef0, trioRef1, trioRef2]
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          const idx = trioRefs.findIndex((r) => r.current === entry.target)
          if (idx !== -1) {
            setTrioVisible((prev) => {
              const next = [...prev]
              next[idx] = true
              return next
            })
          }
          if (entry.target === ctaRef.current) setCtaVisible(true)
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.15 }
    )

    const targets = [trioRef0, trioRef1, trioRef2, ctaRef]
    targets.forEach((r) => { if (r.current) observer.observe(r.current) })
    return () => observer.disconnect()
  }, [])

  const trioRefs = [trioRef0, trioRef1, trioRef2]

  return (
    <div className="min-h-screen bg-rw-bg overflow-x-hidden">

      {/* ── NAV ───────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 sm:px-10 transition-all duration-300',
          scrolled
            ? 'bg-rw-bg/[0.94] backdrop-blur-md border-b border-rw-border-subtle shadow-[0_1px_0_rgba(44,42,37,0.06)]'
            : ''
        )}
      >
        <Link
          href="/"
          className="font-serif text-[18px] font-semibold text-rw-text-primary tracking-tight hover:text-rw-accent transition-colors"
        >
          Remember When
        </Link>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/login"
            className="text-[13.5px] font-medium text-rw-text-muted hover:text-rw-text-primary transition-colors px-1"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-[13.5px] font-semibold text-white bg-rw-accent hover:bg-rw-accent-hover rounded-rw-pill px-5 py-[9px] transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative min-h-svh flex items-center justify-center px-6 sm:px-10 pt-24 pb-20 overflow-hidden">

        {/* Layered warm background radials */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 110% 80% at 50% -10%, rgba(200,152,64,0.14) 0%, transparent 55%)',
              'radial-gradient(ellipse 70%  60% at 5%  80%,  rgba(91,138,125,0.08) 0%, transparent 60%)',
              'radial-gradient(ellipse 60%  50% at 95% 70%,  rgba(200,152,64,0.07) 0%, transparent 55%)',
            ].join(', '),
          }}
        />

        <div className="relative z-10 max-w-[860px] w-full text-center">

          {/* Kicker — serif italic, very faint */}
          <p
            className="font-serif italic text-rw-text-primary/40 leading-none mb-1"
            style={{
              fontSize: 'clamp(18px, 2.4vw, 24px)',
              animation: 'landing-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.10s both',
            }}
          >
            Remember when…
          </p>

          {/* Main headline — large italic serif, quote rotates automatically.
               min-h values sized to the longest quote at each breakpoint so the
               tagline below never shifts position as quotes change. */}
          <h1
            className="font-serif italic font-semibold text-rw-text-primary tracking-[-0.03em] leading-[1.12] mb-7 min-h-[280px] sm:min-h-[210px] md:min-h-[220px] lg:min-h-[250px]"
            style={{
              fontSize: 'clamp(38px, 6.2vw, 68px)',
              animation: 'landing-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.28s both',
            }}
          >
            <span aria-hidden="true" style={QUOTE_MARK_STYLE}>&ldquo;</span>
            <RotatingQuote />
            <span aria-hidden="true" style={QUOTE_MARK_STYLE}>&rdquo;</span>
          </h1>

          {/* Tagline */}
          <p
            className="text-rw-text-muted leading-[1.7] max-w-[500px] mx-auto mb-9"
            style={{
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              animation: 'landing-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.46s both',
            }}
          >
            The place where the people who were there
            {' '}come together to make sure it&rsquo;s never forgotten.
          </p>

          {/* Hero CTA */}
          <div style={{ animation: 'landing-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 0.60s both' }}>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-rw-accent hover:bg-rw-accent-hover rounded-rw-pill px-7 py-3.5 transition-all hover:-translate-y-px active:translate-y-0"
              style={{ boxShadow: '0 4px 16px rgba(91,138,125,0.30)' }}
            >
              Get started for free
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          aria-hidden
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-rw-text-placeholder"
          style={{ animation: 'landing-fade-up 0.8s cubic-bezier(0.22,1,0.36,1) 1.2s both' }}
        >
          <ChevronDown className="size-4 animate-bounce" />
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="relative bg-rw-bg px-6 sm:px-10 py-24">

        {/* Fade-out top rule */}
        <div
          aria-hidden
          className="absolute top-0 left-10 right-10 h-px"
          style={{
            background: `linear-gradient(to right, transparent, var(--rw-color-border) 20%, var(--rw-color-border) 80%, transparent)`,
          }}
        />

        <div className="max-w-[960px] mx-auto">
          {/* Section label */}
          <p className="text-center text-[11px] font-semibold font-sans uppercase tracking-[0.10em] text-rw-accent mb-4">
            How it works
          </p>

          {/* Section headline */}
          <p
            className="font-serif font-normal text-rw-text-primary text-center tracking-[-0.02em] leading-[1.35] max-w-[520px] mx-auto mb-[72px]"
            style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}
          >
            A memory book, built by everyone<br />
            who was part of it.
          </p>

          {/* Three columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {TRIO_ITEMS.map((col, i) => (
              <div
                key={col.num}
                ref={trioRefs[i]}
                className={cn(
                  'relative px-0 sm:px-10 transition-[opacity,transform] duration-[600ms]',
                  i === 0 && 'sm:pl-0',
                  i === 2 && 'sm:pr-0',
                  i < 2 && 'mb-12 sm:mb-0',
                  trioVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                )}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Vertical divider (desktop only, between columns) */}
                {i > 0 && (
                  <div
                    aria-hidden
                    className="hidden sm:block absolute left-0 top-1.5 bottom-0 w-px"
                    style={{
                      background: `linear-gradient(to bottom, var(--rw-color-border), transparent 80%)`,
                    }}
                  />
                )}

                {/* Step number + rule */}
                <div className="flex items-center gap-2.5 font-serif text-[13px] text-rw-text-placeholder tracking-[0.04em] mb-5">
                  {col.num}
                  <span className="flex-1 h-px bg-rw-border" />
                </div>

                {/* Icon bubble */}
                <div className={cn('size-10 rounded-[10px] flex items-center justify-center mb-[18px]', col.iconClass)}>
                  {col.icon}
                </div>

                <h3 className="font-serif text-[20px] font-semibold text-rw-text-primary tracking-[-0.02em] leading-[1.25] mb-3">
                  {col.title}
                </h3>
                <p className="text-[14px] text-rw-text-muted leading-[1.75]">
                  {col.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSE CTA ─────────────────────────────────────────────── */}
      <section
        className="relative px-6 sm:px-10 py-24 text-center overflow-hidden"
        style={{ background: '#F2EDE3' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 70% 100% at 50% 120%, rgba(91,138,125,0.12) 0%, transparent 65%)',
              'radial-gradient(ellipse 50% 80%  at 10% 0%,   rgba(200,152,64,0.10) 0%, transparent 60%)',
            ].join(', '),
          }}
        />

        <div
          ref={ctaRef}
          className={cn(
            'relative z-10 max-w-[560px] mx-auto transition-[opacity,transform] duration-700',
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          )}
        >
          <h2
            className="font-serif font-semibold text-rw-text-primary tracking-[-0.025em] leading-[1.2] mb-5"
            style={{ fontSize: 'clamp(26px, 4vw, 38px)' }}
          >
            The moments already happened.<br />
            Start writing them down.
          </h2>
          <p className="text-[14.5px] text-rw-text-muted leading-[1.65] mb-9">
            Remember When is currently free for everyone.<br />
            No credit card, no catch.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="text-[14.5px] font-semibold text-white bg-rw-accent hover:bg-rw-accent-hover rounded-rw-pill px-[26px] py-3 transition-colors"
              style={{ boxShadow: '0 4px 16px rgba(91,138,125,0.25)' }}
            >
              Create your first moment
            </Link>
            <Link
              href="/pricing"
              className="text-[14px] font-medium text-rw-text-muted hover:text-rw-text-primary transition-colors"
            >
              See pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-rw-bg border-t border-rw-border px-6 sm:px-10 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="font-serif text-[15px] font-semibold text-rw-text-muted tracking-tight"
        >
          Remember When
        </Link>
        <nav className="flex gap-6">
          <Link href="/pricing" className="text-[12.5px] text-rw-text-placeholder hover:text-rw-text-muted transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="text-[12.5px] text-rw-text-placeholder hover:text-rw-text-muted transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="text-[12.5px] text-rw-text-placeholder hover:text-rw-text-muted transition-colors">
            Get started
          </Link>
        </nav>
        <p className="text-[12px] text-rw-text-placeholder">© 2026 Remember When</p>
      </footer>

    </div>
  )
}

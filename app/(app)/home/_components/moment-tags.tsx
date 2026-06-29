'use client'

import { useLayoutEffect, useRef, useState } from 'react'

const PILL_CLASS =
  'inline-flex shrink-0 items-center rounded-full bg-rw-accent-subtle text-rw-accent px-2 py-0.5 text-[10px] font-medium whitespace-nowrap'

/**
 * Renders a moment's tags on a single line. Shows as many tags as fit the
 * available width, then a "+N more" pill for the remainder.
 *
 * The full `tags` array still lives on the moment data and powers search — this
 * component only limits what's *displayed*, never what's searchable.
 *
 * The container is `overflow-hidden` with a fixed one-line height, so even
 * before the measurement effect runs (SSR / first paint) tags never wrap to a
 * second line and the card height stays stable.
 */
export function MomentTags({ tags }: { tags: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Hidden row used purely for measuring intrinsic pill widths.
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(tags.length)

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const GAP = 4 // matches gap-1 (0.25rem)

    function recompute() {
      const available = container!.clientWidth
      const pills = Array.from(measure!.children) as HTMLElement[]
      const tagWidths = pills.slice(0, tags.length).map((el) => el.offsetWidth)
      // Last child of the measure row is the "+N more" template pill.
      const overflowWidth = pills[pills.length - 1]?.offsetWidth ?? 0

      // First pass: how many fit if nothing is hidden (no "+N more" needed)?
      let used = 0
      let fit = 0
      for (let i = 0; i < tagWidths.length; i++) {
        const next = used + (i === 0 ? 0 : GAP) + tagWidths[i]
        if (next > available) break
        used = next
        fit++
      }

      if (fit === tags.length) {
        setVisibleCount(tags.length)
        return
      }

      // Some tags overflow → reserve room for the "+N more" pill and recount.
      used = 0
      let fitWithOverflow = 0
      for (let i = 0; i < tagWidths.length; i++) {
        const next = used + (i === 0 ? 0 : GAP) + tagWidths[i]
        if (next + GAP + overflowWidth > available) break
        used = next
        fitWithOverflow++
      }
      // Always show at least one tag, even if it must be clipped by overflow-hidden.
      setVisibleCount(Math.max(1, fitWithOverflow))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(container)
    return () => ro.disconnect()
  }, [tags])

  const hiddenCount = tags.length - visibleCount

  return (
    <div ref={containerRef} className="relative flex h-[18px] items-center gap-1 overflow-hidden">
      {/* Visible, clamped row */}
      {tags.slice(0, visibleCount).map((tag) => (
        <span key={tag} className={PILL_CLASS}>
          {tag}
        </span>
      ))}
      {hiddenCount > 0 && <span className={PILL_CLASS}>+{hiddenCount} more</span>}

      {/* Hidden measurement row — never visible, used to read intrinsic widths */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex gap-1"
      >
        {tags.map((tag) => (
          <span key={tag} className={PILL_CLASS}>
            {tag}
          </span>
        ))}
        <span className={PILL_CLASS}>+{tags.length} more</span>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Minus, Maximize2, MapPin, Globe2, X } from 'lucide-react'
import { geoMercator, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry, Polygon } from 'geojson'
import worldTopo from '@/lib/places/world.json'
import { countryName } from '@/lib/places/countries.client'
import {
  partitionLocated,
  clusterByCountry,
  clusterByCity,
  sortNewestFirst,
  type MapMoment,
  type Cluster,
} from '@/lib/places/geo'
import type { MomentSummary } from '../actions'
import { cn } from '@/lib/utils'

const WIDTH = 800
// Above this zoom, per-country dots break into per-city dots.
const CITY_ZOOM = 2.8
// Below this zoom, markers are small featureless dots (no number, no label).
const DOTS_DETAIL = 1.8
const MAX_ZOOM = 40

// Mercator, clipped to a sensible latitude band so it fills the frame without
// the infinite poles / an oversized Antarctica. HEIGHT is derived so the clip
// fills the viewBox exactly (no oval margins).
const CLIP: Polygon = {
  type: 'Polygon',
  coordinates: [[[-180, 78], [180, 78], [180, -56], [-180, -56], [-180, 78]]],
}
const HEIGHT = (() => {
  const tmp = geoMercator().fitWidth(WIDTH, CLIP)
  const [[, y0], [, y1]] = geoPath(tmp).bounds(CLIP)
  return Math.round(y1 - y0)
})()
const projection = geoMercator().fitSize([WIDTH, HEIGHT], CLIP)
const pathGen = geoPath(projection)

// Decode + pre-project the world once at module load (static asset, fixed projection).
const countryPaths: { key: string; d: string }[] = (() => {
  const topo = worldTopo as unknown as Topology
  const fc = feature(topo, topo.objects.countries as GeometryCollection)
  // Index as key — the array is static and some 50m geometries share an id.
  return (fc.features as Feature<Geometry>[]).map((g, i) => ({
    key: String(i),
    d: pathGen(g) ?? '',
  }))
})()

function dotRadius(count: number, detailed: boolean): number {
  return detailed ? Math.min(11 + Math.log2(count) * 3.2, 22) : 4
}

type Transform = { k: number; x: number; y: number }
type Selection = { title: string; kind: 'city' | 'country' | 'none'; moments: MapMoment[] } | null

export function MomentsMap({ moments }: { moments: MomentSummary[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [t, setT] = useState<Transform>({ k: 1, x: 0, y: 0 })
  const [selected, setSelected] = useState<Selection>(null)

  const mapMoments = useMemo<MapMoment[]>(
    () =>
      moments.map((m) => ({
        id: m.id,
        name: m.name,
        location: m.location,
        countryCode: m.placeCountryCode,
        lat: m.placeLat,
        lng: m.placeLng,
        coverPhotoUrl: m.coverPhotoUrl,
        dateYear: m.dateYear,
        dateMonth: m.dateMonth,
        dateDay: m.dateDay,
        createdAt: m.createdAt,
      })),
    [moments]
  )

  const { located, unlocated } = useMemo(() => partitionLocated(mapMoments), [mapMoments])
  // Sort newest→oldest up front so every cluster's moments (and the popover list) are newest-first.
  const sortedLocated = useMemo(() => sortNewestFirst(located), [located])
  const mode: 'country' | 'city' = t.k < CITY_ZOOM ? 'country' : 'city'
  const clusters = useMemo(
    () => (mode === 'country' ? clusterByCountry(sortedLocated) : clusterByCity(sortedLocated)),
    [sortedLocated, mode]
  )
  const detailed = t.k >= DOTS_DETAIL

  function clusterTitle(c: Cluster): string {
    if (mode === 'country') return countryName(c.countryCode)
    return c.moments[0].location ?? countryName(c.countryCode)
  }

  // Greedy screen-space label collision: names appear only when zoomed in enough
  // that they don't overlap. Higher-count clusters win ties. Recomputed on pan/zoom.
  const visibleLabels = useMemo(() => {
    const shown = new Set<string>()
    if (!detailed) return shown
    const FONT = 11
    type Box = { x0: number; y0: number; x1: number; y1: number }
    const placed: Box[] = []
    const ranked = [...clusters].sort((a, b) => b.moments.length - a.moments.length)
    for (const c of ranked) {
      const p = projection([c.lng, c.lat])
      if (!p) continue
      const sx = t.x + t.k * p[0]
      const sy = t.y + t.k * p[1]
      const label = mode === 'country' ? countryName(c.countryCode) : c.moments[0].location ?? countryName(c.countryCode)
      const w = label.length * FONT * 0.6
      const top = dotRadius(c.moments.length, true) + 6
      const box: Box = { x0: sx - w / 2, y0: sy - top - FONT, x1: sx + w / 2, y1: sy - top }
      const clash = placed.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))
      if (!clash) {
        shown.add(c.key)
        placed.push(box)
      }
    }
    return shown
  }, [clusters, t, detailed, mode])

  // Attach d3-zoom (handles wheel, drag, and touch pinch/pan).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const sel = select(svg)
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [-0.15 * WIDTH, -0.15 * HEIGHT],
        [1.15 * WIDTH, 1.15 * HEIGHT],
      ])
      .on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y })
      })
    sel.call(behavior)
    zoomRef.current = behavior
    return () => {
      sel.on('.zoom', null)
    }
  }, [])

  function scaleBy(factor: number) {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior) return
    behavior.scaleBy(select(svg), factor)
  }

  function resetZoom() {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior) return
    behavior.transform(select(svg), zoomIdentity)
  }

  const inv = 1 / t.k

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-rw-border bg-rw-surface">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="block h-[52vh] max-h-[720px] min-h-[320px] w-full cursor-grab select-none active:cursor-grabbing sm:h-[62vh]"
        style={{ touchAction: 'none', background: 'var(--rw-color-bg)' }}
        role="img"
        aria-label="World map of your moments"
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {/* Land */}
          {countryPaths.map((c) => (
            <path
              key={c.key}
              d={c.d}
              style={{
                fill: 'var(--rw-color-surface-raised)',
                stroke: 'var(--rw-color-text-placeholder)',
                strokeWidth: 0.9 * inv,
                strokeLinejoin: 'round',
              }}
            />
          ))}

          {/* Markers — net scale is 1 (outer scale k × inner scale 1/k), so their
              content is drawn at constant screen size, positioned at the projected point. */}
          {clusters.map((c) => {
            const p = projection([c.lng, c.lat])
            if (!p) return null
            const [cx, cy] = p
            const count = c.moments.length
            const r = dotRadius(count, detailed)
            const showLabel = visibleLabels.has(c.key)
            const isCountry = mode === 'country'
            return (
              <g
                key={c.key}
                transform={`translate(${cx},${cy}) scale(${inv})`}
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  setSelected({
                    title: clusterTitle(c),
                    kind: isCountry ? 'country' : 'city',
                    moments: c.moments,
                  })
                }
              >
                {showLabel && (
                  <text
                    y={-(r + 6)}
                    textAnchor="middle"
                    style={{
                      fill: 'var(--rw-color-text-primary)',
                      fontSize: 11,
                      fontWeight: 600,
                      paintOrder: 'stroke',
                      stroke: 'var(--rw-color-bg)',
                      strokeWidth: 3,
                    }}
                  >
                    {clusterTitle(c)}
                  </text>
                )}
                <circle
                  r={r}
                  style={{ fill: 'var(--rw-color-accent)' }}
                  stroke="var(--rw-color-white)"
                  strokeWidth={detailed ? 1.5 : 1}
                />
                {detailed && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fill: 'var(--rw-color-white)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}
                  >
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <MapButton label="Zoom in" onClick={() => scaleBy(1.6)}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => scaleBy(1 / 1.6)}>
          <Minus className="size-4" />
        </MapButton>
        <MapButton label="Reset view" onClick={resetZoom}>
          <Maximize2 className="size-4" />
        </MapButton>
      </div>

      {/* Off-map bucket */}
      {unlocated.length > 0 && (
        <button
          type="button"
          onClick={() => setSelected({ title: 'No location', kind: 'none', moments: sortNewestFirst(unlocated) })}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-rw-border bg-rw-bg/90 px-3 py-1.5 text-xs font-medium text-rw-text-muted shadow-rw-card backdrop-blur transition-colors hover:text-rw-text-primary"
        >
          <MapPin className="size-3.5" />
          No location
          <span className="ml-0.5 tabular-nums text-rw-text-primary">{unlocated.length}</span>
        </button>
      )}

      {/* Selected cluster panel — bottom sheet on mobile, floating card on desktop */}
      {selected && (
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:right-3 sm:w-80">
          <div className="rounded-xl border border-rw-border bg-rw-bg/95 shadow-rw-modal backdrop-blur">
            <div className="flex items-center justify-between gap-2 border-b border-rw-border-subtle px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {selected.kind === 'country' ? (
                  <Globe2 className="size-3.5 shrink-0 text-rw-text-muted" />
                ) : (
                  <MapPin className="size-3.5 shrink-0 text-rw-text-muted" />
                )}
                <p className="truncate text-sm font-semibold text-rw-text-primary">{selected.title}</p>
                <span className="shrink-0 text-xs text-rw-text-muted">· {selected.moments.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1 text-rw-text-muted hover:bg-rw-surface-raised hover:text-rw-text-primary"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto p-1.5">
              {selected.moments.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/moments/${m.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-rw-surface-raised"
                  >
                    <span
                      className={cn(
                        'size-9 shrink-0 overflow-hidden rounded-md bg-rw-surface-raised',
                        'flex items-center justify-center'
                      )}
                    >
                      {m.coverPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL; see docs/lint-exceptions.md
                        <img src={m.coverPhotoUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <MapPin className="size-4 text-rw-text-placeholder" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-rw-text-primary">{m.name}</span>
                      {m.location && (
                        <span className="block truncate text-xs text-rw-text-muted">{m.location}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-rw-border bg-rw-bg/90 text-rw-text-primary shadow-rw-card backdrop-blur transition-colors hover:bg-rw-surface-raised"
    >
      {children}
    </button>
  )
}

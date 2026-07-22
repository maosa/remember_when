'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Minus, Maximize2, MapPin, Globe2, X } from 'lucide-react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, Geometry } from 'geojson'
import worldTopo from '@/lib/places/world-110m.json'
import { countryName } from '@/lib/places/countries.client'
import {
  partitionLocated,
  clusterByCountry,
  clusterByCity,
  type MapMoment,
  type Cluster,
} from '@/lib/places/geo'
import type { MomentSummary } from '../actions'
import { cn } from '@/lib/utils'

const WIDTH = 800
const HEIGHT = 420
// Below this zoom, moments collapse into one dot per country; at or above it,
// dots break apart into individual cities.
const CITY_ZOOM = 2.8
const MAX_ZOOM = 14

// Decode the world map once at module load (static asset, never changes).
const geographies: Feature<Geometry>[] = (() => {
  const topo = worldTopo as unknown as Topology
  const fc = feature(topo, topo.objects.countries as GeometryCollection)
  return fc.features
})()

type Selection = { title: string; kind: 'city' | 'country' | 'none'; moments: MapMoment[] } | null

export function MomentsMap({ moments }: { moments: MomentSummary[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [k, setK] = useState(1)
  const [transform, setTransform] = useState('translate(0,0) scale(1)')
  const [selected, setSelected] = useState<Selection>(null)

  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: 'Sphere' }),
    []
  )
  const pathGen = useMemo(() => geoPath(projection), [projection])
  const spherePath = useMemo(() => pathGen({ type: 'Sphere' }) ?? '', [pathGen])
  const countryPaths = useMemo(
    () => geographies.map((g, i) => ({ key: (g.id as string) ?? i, d: pathGen(g) ?? '' })),
    [pathGen]
  )

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
      })),
    [moments]
  )

  const { located, unlocated } = useMemo(() => partitionLocated(mapMoments), [mapMoments])
  const mode: 'country' | 'city' = k < CITY_ZOOM ? 'country' : 'city'
  const clusters = useMemo(
    () => (mode === 'country' ? clusterByCountry(located) : clusterByCity(located)),
    [located, mode]
  )

  // Attach d3-zoom (handles wheel, drag, and touch pinch/pan).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const sel = select(svg)
    const behavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(e.transform.toString())
        setK(e.transform.k)
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

  function clusterTitle(c: Cluster): string {
    if (mode === 'country') return countryName(c.countryCode)
    // City mode: use the first moment's own label (e.g. "Barcelona, Spain").
    return c.moments[0].location ?? countryName(c.countryCode)
  }

  // Counter-scale marker size so dots stay a constant screen size while zooming.
  const inv = 1 / k

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-rw-border bg-rw-surface">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-[62vh] max-h-[720px] min-h-[340px] w-full cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        role="img"
        aria-label="World map of your moments"
      >
        <g transform={transform}>
          {/* Ocean / sphere */}
          <path d={spherePath} style={{ fill: 'var(--rw-color-bg)' }} />
          {/* Land */}
          {countryPaths.map((c) => (
            <path
              key={c.key}
              d={c.d}
              style={{
                fill: 'var(--rw-color-surface-raised)',
                stroke: 'var(--rw-color-border)',
                strokeWidth: 0.5 * inv,
              }}
            />
          ))}

          {/* Markers */}
          {clusters.map((c) => {
            const p = projection([c.lng, c.lat])
            if (!p) return null
            const [cx, cy] = p
            const count = c.moments.length
            const r = Math.min(11 + Math.log2(count) * 3.2, 22)
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
                {/* Label */}
                <text
                  y={-r - 5}
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
                {/* Dot */}
                <circle
                  r={r}
                  style={{ fill: 'var(--rw-color-accent)' }}
                  stroke="var(--rw-color-white)"
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: 'var(--rw-color-white)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}
                >
                  {count}
                </text>
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
          onClick={() => setSelected({ title: 'No location', kind: 'none', moments: unlocated })}
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

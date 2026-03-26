export default function MomentLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Cover photo placeholder */}
      <div className="relative h-52 sm:h-72 bg-rw-surface-raised" />

      {/* Tags row */}
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-3 border-b border-rw-border-subtle flex gap-2">
        {[48, 56, 40].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-rw-surface-raised" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Members row */}
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-3 border-b border-rw-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="size-7 rounded-full bg-rw-surface-raised border-2 border-rw-bg" />
            ))}
          </div>
          <div className="h-4 w-20 rounded bg-rw-surface-raised" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-rw-button bg-rw-surface-raised" />
          <div className="h-7 w-7 rounded-rw-button bg-rw-surface-raised" />
          <div className="h-7 w-7 rounded-rw-button bg-rw-surface-raised" />
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="mx-auto max-w-[720px] px-4 md:px-6 py-10 space-y-3">
        <div className="h-5 w-16 rounded-md bg-rw-surface-raised" />
        {[100, 72, 120].map((h, i) => (
          <div
            key={i}
            className="rounded-rw-card border border-rw-border-subtle bg-rw-surface"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  )
}

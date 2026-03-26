export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 py-8 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-40 rounded-md bg-rw-surface-raised animate-pulse" />
        <div className="h-9 w-32 rounded-rw-button bg-rw-surface-raised animate-pulse" />
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2">
        <div className="h-10 flex-1 rounded-rw-input bg-rw-surface-raised animate-pulse" />
        <div className="h-10 w-36 rounded-rw-button bg-rw-surface-raised animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-rw-border-subtle pb-0.5">
        <div className="h-5 w-20 rounded-md bg-rw-surface-raised animate-pulse" />
        <div className="h-5 w-20 rounded-md bg-rw-surface-raised animate-pulse" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-rw-card border border-rw-border-subtle bg-rw-surface animate-pulse overflow-hidden"
          >
            <div className="h-36 bg-rw-surface-raised" />
            <div className="px-3.5 pt-3 pb-3.5 space-y-2">
              <div className="h-3.5 w-24 rounded bg-rw-surface-raised" />
              <div className="h-3.5 w-32 rounded bg-rw-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

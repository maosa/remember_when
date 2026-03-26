export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10 animate-pulse">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-rw-button bg-rw-surface-raised" />
        <div className="h-7 w-52 rounded-md bg-rw-surface-raised" />
      </div>

      {/* Toggle rows */}
      <div className="space-y-5">
        <div className="h-4 w-20 rounded bg-rw-surface-raised" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 rounded bg-rw-surface-raised" />
              <div className="h-3 w-52 rounded bg-rw-surface-raised" />
            </div>
            <div className="h-6 w-10 rounded-full bg-rw-surface-raised shrink-0" />
          </div>
        ))}
      </div>

      <div className="h-9 w-32 rounded-rw-button bg-rw-surface-raised" />
    </div>
  )
}

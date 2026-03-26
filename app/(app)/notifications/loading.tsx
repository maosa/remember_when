export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 animate-pulse">
      <div className="flex items-center justify-between mb-10">
        <div className="h-8 w-36 rounded-md bg-rw-surface-raised" />
        <div className="h-8 w-24 rounded-rw-button bg-rw-surface-raised" />
      </div>

      <div className="divide-y divide-rw-border-subtle">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-4">
            <div className="size-8 rounded-full bg-rw-surface-raised shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3.5 w-3/4 rounded bg-rw-surface-raised" />
              <div className="h-3 w-16 rounded bg-rw-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

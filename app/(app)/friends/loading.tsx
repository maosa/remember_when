export default function FriendsLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10 animate-pulse">
      <div className="h-8 w-24 rounded-md bg-rw-surface-raised" />

      {/* Search box */}
      <div className="h-10 w-full rounded-rw-input bg-rw-surface-raised" />

      {/* User rows */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-rw-surface-raised shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-rw-surface-raised" />
              <div className="h-3 w-20 rounded bg-rw-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

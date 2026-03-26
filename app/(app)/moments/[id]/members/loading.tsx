export default function MembersLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-8 space-y-6 animate-pulse">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-rw-button bg-rw-surface-raised" />
        <div className="h-7 w-40 rounded-md bg-rw-surface-raised" />
      </div>

      {/* Section heading */}
      <div className="h-4 w-32 rounded bg-rw-surface-raised" />

      {/* Member rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-rw-surface-raised shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 rounded bg-rw-surface-raised" />
            <div className="h-3 w-16 rounded bg-rw-surface-raised" />
          </div>
        </div>
      ))}
    </div>
  )
}

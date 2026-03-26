export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-4 md:px-6 py-12 space-y-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 rounded-md bg-rw-surface-raised" />
        <div className="h-8 w-20 rounded-rw-button bg-rw-surface-raised" />
      </div>

      {/* Avatar section */}
      <div className="space-y-4">
        <div className="h-4 w-16 rounded bg-rw-surface-raised" />
        <div className="size-20 rounded-full bg-rw-surface-raised" />
      </div>

      <div className="h-px bg-rw-border-subtle" />

      {/* Profile fields */}
      <div className="space-y-4">
        <div className="h-4 w-16 rounded bg-rw-surface-raised" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-rw-surface-raised" />
            <div className="h-9 w-full rounded-rw-input bg-rw-surface-raised" />
          </div>
        ))}
      </div>

      <div className="h-px bg-rw-border-subtle" />

      {/* Security */}
      <div className="space-y-4">
        <div className="h-4 w-20 rounded bg-rw-surface-raised" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-9 w-full rounded-rw-input bg-rw-surface-raised" />
        ))}
      </div>
    </div>
  )
}

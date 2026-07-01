import { cn } from '@/lib/utils'

/**
 * Inline form-level error banner. Renders nothing when `children` is falsy, so
 * call sites can pass a possibly-empty error string directly:
 *
 *   <FormError>{error}</FormError>
 *
 * Replaces the identical hand-rolled banner that was duplicated across the auth
 * pages, account, and members panels.
 */
export function FormError({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        'rounded-[8px] border border-rw-danger/20 bg-rw-danger-subtle px-3.5 py-2.5 text-[13px] text-rw-danger',
        className,
      )}
    >
      {children}
    </div>
  )
}

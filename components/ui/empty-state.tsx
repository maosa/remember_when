import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

// Centred empty state — used when a list or section has no content
function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-8 py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-rw-text-placeholder [&_svg]:size-11">
          {icon}
        </div>
      )}
      {/* Title — Lora serif (set globally for all headings) */}
      <h3 className="mb-2 text-[16px] font-semibold text-rw-text-muted">
        {title}
      </h3>
      {description && (
        <p className="mb-5 max-w-[260px] text-[14px] text-rw-text-placeholder leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export { EmptyState }

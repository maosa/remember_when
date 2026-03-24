import * as React from "react"
import { cn } from "@/lib/utils"

interface DangerZoneProps extends React.ComponentProps<"div"> {
  title: string
  description: string
  action: React.ReactNode
}

// Danger zone section — red-tinted panel used on account/moment settings pages
function DangerZone({ className, title, description, action, ...props }: DangerZoneProps) {
  return (
    <div
      className={cn(
        "rounded-rw-card border border-rw-danger/40 bg-rw-danger-subtle px-6 py-5",
        className
      )}
      {...props}
    >
      {/* Label */}
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-rw-danger">
        Danger zone
      </p>
      {/* Title */}
      <p className="mb-1.5 text-[15px] font-semibold text-rw-text-primary">
        {title}
      </p>
      {/* Description */}
      <p className="mb-4 text-[14px] text-rw-text-muted leading-relaxed">
        {description}
      </p>
      {/* Action — typically a destructive-outline Button */}
      <div>{action}</div>
    </div>
  )
}

export { DangerZone }

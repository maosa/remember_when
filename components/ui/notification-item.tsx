import * as React from "react"
import { cn } from "@/lib/utils"

interface NotificationItemProps extends React.ComponentProps<"div"> {
  unread?: boolean
  icon?: React.ReactNode
  timestamp?: string
  actions?: React.ReactNode
}

// A single notification row — used on the /notifications page
function NotificationItem({
  className,
  unread = false,
  icon,
  timestamp,
  actions,
  children,
  ...props
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-[10px] px-4 py-3.5 transition-colors",
        // Unread — very subtle warm blue tint
        unread ? "bg-rw-blue-subtle" : "hover:bg-rw-surface",
        className
      )}
      {...props}
    >
      {/* Icon bubble */}
      {icon && (
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            unread
              ? "bg-rw-accent-subtle text-rw-accent"
              : "bg-rw-surface-raised text-rw-text-muted"
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-rw-text-primary leading-snug">
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-2 mt-2.5">{actions}</div>
        )}
      </div>

      {/* Timestamp + unread dot */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {timestamp && (
          <span className="text-[11px] text-rw-text-placeholder whitespace-nowrap">
            {timestamp}
          </span>
        )}
        {unread && (
          <span
            className="size-2 rounded-full bg-rw-blue shrink-0"
            aria-label="Unread"
          />
        )}
      </div>
    </div>
  )
}

// Banner — info/success/error/warning strip
interface BannerProps extends React.ComponentProps<"div"> {
  variant?: "info" | "success" | "error" | "warning"
  icon?: React.ReactNode
}

const bannerVariants = {
  info:    "bg-rw-blue-subtle border-l-[3px] border-rw-blue text-rw-text-primary",
  success: "bg-rw-accent-subtle border-l-[3px] border-rw-accent text-rw-accent",
  error:   "bg-rw-danger-subtle border-l-[3px] border-rw-danger text-rw-danger",
  warning: "bg-[#FEF3C7] border-l-[3px] border-[#D97706] text-[#92400E]",
}

function Banner({
  className,
  variant = "info",
  icon,
  children,
  ...props
}: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[10px] px-4 py-3 text-[14px] leading-relaxed",
        bannerVariants[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  )
}

export { NotificationItem, Banner }

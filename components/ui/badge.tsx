import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base — pill shape, 12px DM Sans 500, inline-flex
  "inline-flex items-center gap-1 rounded-rw-pill px-2.5 py-0.5 text-[12px] font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        // Default — sage-teal tint (accent tags)
        default:
          "border border-transparent bg-rw-accent-subtle text-rw-accent",
        // Muted — neutral surface tint (general tags, most common)
        secondary:
          "border border-transparent bg-rw-surface-raised text-rw-text-muted",
        // Same as secondary — explicit alias used in moment cards
        muted:
          "border border-transparent bg-rw-surface-raised text-rw-text-muted",
        // Blue — info / invite tags
        blue:
          "border border-transparent bg-rw-blue-subtle text-rw-blue",
        // Outlined — neutral border, no fill
        outline:
          "border border-rw-border text-rw-text-primary",
        // Danger — error / destructive
        danger:
          "border border-transparent bg-rw-danger-subtle text-rw-danger",
        // Owner role badge — warm amber tint
        owner:
          "border border-transparent bg-[#F0EAD4] text-[#8B7030]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

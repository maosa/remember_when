// buttonVariants lives here — no "use client" — so it can be imported
// safely from both Server and Client Components.
// components/ui/button.tsx re-exports it for backwards compatibility.

import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base — matches design system: 13px DM Sans 500, 8px radius, smooth transition
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-rw-button border border-transparent bg-clip-padding text-[13px] font-medium leading-none whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-rw-accent/25 focus-visible:border-rw-accent active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-rw-danger aria-invalid:ring-3 aria-invalid:ring-rw-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary — sage-teal fill, white text
        default:
          "bg-rw-accent text-rw-white border-rw-accent hover:bg-rw-accent-hover hover:border-rw-accent-hover",
        // Secondary — outlined, transparent background
        outline:
          "border-rw-border bg-transparent text-rw-text-primary hover:bg-rw-surface-raised",
        // Same as outline — kept for shadcn component compatibility
        secondary:
          "border-rw-border bg-transparent text-rw-text-primary hover:bg-rw-surface-raised",
        // Ghost — no border, muted text
        ghost:
          "text-rw-text-muted hover:bg-rw-surface-raised hover:text-rw-text-primary aria-expanded:bg-rw-surface-raised aria-expanded:text-rw-text-primary",
        // Destructive — solid red fill, white text
        destructive:
          "bg-rw-danger text-rw-white border-rw-danger hover:bg-[#a93226] hover:border-[#a93226] focus-visible:ring-rw-danger/25",
        // Destructive outline — subtle red bg with red border
        "destructive-outline":
          "bg-rw-danger-subtle text-rw-danger border-rw-danger hover:bg-[#fad7d4] focus-visible:ring-rw-danger/25",
        // Link
        link: "text-rw-accent underline-offset-4 hover:underline",
      },
      size: {
        // Default — 36px height
        default:
          "h-9 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // Small — 28px height
        sm: "h-7 px-2.5 text-[12px]",
        // Extra small — 24px height
        xs: "h-6 px-2 text-[11px] rounded-[6px]",
        // Large — 44px height (full-width CTAs)
        lg: "h-11 px-5 text-[14px]",
        // Icon sizes
        icon:    "size-9",
        "icon-sm": "size-7",
        "icon-xs": "size-6 rounded-[6px]",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export { buttonVariants }
export type { VariantProps }

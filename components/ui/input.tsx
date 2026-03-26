import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base — 40px height, surface bg, border, 8px radius, 14px DM Sans
        "h-10 w-full min-w-0 rounded-rw-input border border-rw-border bg-rw-surface px-3 py-1 text-base md:text-[14px] text-rw-text-primary transition-colors outline-none",
        // Placeholder
        "placeholder:text-rw-text-placeholder",
        // Focus — accent border + subtle ring
        "focus-visible:border-rw-accent focus-visible:ring-3 focus-visible:ring-rw-accent/[0.12]",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-rw-text-primary",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid / error — danger border + subtle ring
        "aria-invalid:border-rw-danger aria-invalid:ring-3 aria-invalid:ring-rw-danger/10",
        className
      )}
      {...props}
    />
  )
}

export { Input }

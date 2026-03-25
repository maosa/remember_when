"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

function Tabs({ ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />
}

// Underline-style tab list — matches design system (no pill background)
function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-0 border-b border-rw-border-subtle",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "group inline-flex items-center justify-center px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors outline-none",
        "-mb-px border-b-2 border-transparent",
        "text-rw-text-muted hover:text-rw-text-primary",
        "focus-visible:ring-2 focus-visible:ring-rw-accent/30 rounded-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        // Active — accent underline, primary text
        "data-[active]:border-rw-accent data-[active]:text-rw-text-primary",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

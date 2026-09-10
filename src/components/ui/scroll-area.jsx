// @ts-nocheck
"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("group/scroll-area relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-xl transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none rounded-full bg-muted/70 opacity-100 transition-[background-color,opacity] duration-200 group-hover/scroll-area:bg-muted/80 data-horizontal:h-3 data-horizontal:flex-col data-horizontal:mx-1 data-horizontal:mb-1 data-horizontal:border-t data-horizontal:border-t-transparent data-horizontal:px-0.5 data-horizontal:py-px data-vertical:h-full data-vertical:w-3 data-vertical:mr-1 data-vertical:border-l data-vertical:border-l-transparent data-vertical:px-px data-vertical:py-0.5",
        className
      )}
      {...props}>
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full border border-primary/15 bg-primary/55 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,white),0_1px_2px_rgba(10,61,46,0.18)] transition-[background-color,box-shadow] duration-200 group-hover/scroll-area:bg-primary/70" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar }

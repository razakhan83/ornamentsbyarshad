// @ts-nocheck
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @param {{ className?: string; [key: string]: any }} props
 */
function Textarea({
  className = "",
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full rounded-lg border px-3.5 py-3 text-sm leading-6 text-foreground shadow-none outline-none transition-[border-color,background-color,color] duration-200 ease-out resize-y",
        "border-slate-300 dark:border-border/80 bg-card",
        "placeholder:text-muted-foreground/70",
        "hover:border-slate-400 dark:hover:border-border",
        "focus-visible:border-primary focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-primary/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40 disabled:shadow-none",
        "aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-3 aria-invalid:ring-destructive/15 aria-invalid:shadow-none",
        className
      )}
      {...props} />
  );
}

export { Textarea }

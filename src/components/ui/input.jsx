// @ts-nocheck
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * @param {{ className?: string; type?: string; [key: string]: any }} props
 */
function Input({
  className = "",
  type,
  ...props
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border px-3.5 py-2 text-sm text-foreground shadow-none outline-none transition-[border-color,background-color,color] duration-200 ease-out",
        "border-slate-300 dark:border-border/80 bg-card",
        "placeholder:text-muted-foreground/70",
        "hover:border-slate-400 dark:hover:border-border",
        "focus-visible:border-primary focus-visible:bg-card focus-visible:ring-3 focus-visible:ring-primary/15",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/40 disabled:shadow-none",
        "aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-3 aria-invalid:ring-destructive/15 aria-invalid:shadow-none",
        className
      )}
      {...props} />
  );
}

export { Input }

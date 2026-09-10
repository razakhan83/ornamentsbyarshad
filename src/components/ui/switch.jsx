// @ts-nocheck
"use client";

import { cn } from "@/lib/utils";

export function Switch({ checked = false, disabled = false, onCheckedChange, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input dark:bg-input/80",
        className,
      )}
      {...props}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

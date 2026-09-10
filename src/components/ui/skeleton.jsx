// @ts-nocheck
"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const SkeletonContext = createContext({
  animate: true,
  variant: "shimmer",
});

function SkeletonProvider({ animate = true, variant = "shimmer", children }) {
  return (
    <SkeletonContext.Provider value={{ animate, variant }}>
      {children}
    </SkeletonContext.Provider>
  );
}

function useSkeletonContext() {
  return useContext(SkeletonContext);
}

function Skeleton({ className, animate, variant, ...props }) {
  const context = useContext(SkeletonContext);
  const isAnimated = animate !== undefined ? animate : (context?.animate ?? true);
  const resolvedVariant = variant || context?.variant || "shimmer";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        resolvedVariant === "pulse" && isAnimated && "animate-pulse",
        className
      )}
      {...props}
    >
      {isAnimated && resolvedVariant === "shimmer" && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:400%_100%]" />
      )}
    </div>
  );
}

function SkeletonText({ className, width = "w-20", animate, variant, ...props }) {
  return (
    <Skeleton
      animate={animate}
      variant={variant}
      className={cn(`h-4 ${width}`, className)}
      {...props}
    />
  );
}

function SkeletonCard({ className, animate, variant, ...props }) {
  return (
    <div className={cn("admin-stat-card p-6 flex flex-col gap-4", className)} {...props}>
      <Skeleton animate={animate} variant={variant} className="size-8 rounded-md" />
      <div className="space-y-2">
        <SkeletonText animate={animate} variant={variant} width="w-[60px]" className="h-6" />
        <SkeletonText animate={animate} variant={variant} width="w-[90px]" className="h-3" />
      </div>
    </div>
  );
}

function SkeletonRow({ className, columns = 6, animate, variant, ...props }) {
  // Default skeleton row for tables
  return (
    <tr className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props}>
      <td className="p-4 align-middle"><SkeletonText animate={animate} variant={variant} width="w-[100px]" /></td>
      <td className="p-4 align-middle space-y-1">
        <SkeletonText animate={animate} variant={variant} width="w-[120px]" />
        <SkeletonText animate={animate} variant={variant} width="w-[90px]" className="h-3" />
      </td>
      <td className="p-4 align-middle"><Skeleton animate={animate} variant={variant} className="h-5 w-[60px] rounded-full" /></td>
      <td className="p-4 align-middle space-y-1">
        <SkeletonText animate={animate} variant={variant} width="w-[80px]" />
        <SkeletonText animate={animate} variant={variant} width="w-[60px]" className="h-3" />
      </td>
      <td className="p-4 align-middle"><Skeleton animate={animate} variant={variant} className="h-6 w-[90px] rounded-full" /></td>
      <td className="p-4 align-middle text-right flex justify-end"><SkeletonText animate={animate} variant={variant} width="w-[60px]" /></td>
    </tr>
  );
}

function SkeletonProductRow({ className, animate, variant, ...props }) {
  return (
    <tr className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props}>
      <td className="p-4 align-middle">
        <div className="flex items-center gap-3">
          <Skeleton animate={animate} variant={variant} className="size-10 rounded-md shrink-0" />
          <div className="space-y-1">
            <SkeletonText animate={animate} variant={variant} width="w-[140px]" />
            <SkeletonText animate={animate} variant={variant} width="w-[80px]" className="h-3" />
          </div>
        </div>
      </td>
      <td className="p-4 align-middle"><SkeletonText animate={animate} variant={variant} width="w-[60px]" /></td>
      <td className="p-4 align-middle"><SkeletonText animate={animate} variant={variant} width="w-[80px]" /></td>
      <td className="p-4 align-middle"><Skeleton animate={animate} variant={variant} className="h-5 w-[85px] rounded-full" /></td>
      <td className="p-4 align-middle"><Skeleton animate={animate} variant={variant} className="h-5 w-[60px] rounded-full" /></td>
      <td className="p-4 align-middle text-right flex justify-end"><Skeleton animate={animate} variant={variant} className="size-8 rounded-md" /></td>
    </tr>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonRow, SkeletonProductRow, SkeletonProvider, useSkeletonContext };

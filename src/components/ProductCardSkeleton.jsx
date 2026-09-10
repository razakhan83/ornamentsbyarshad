import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProductCardSkeleton({ className, animate, variant, ...props }) {
  return (
    <div
      className={cn(
        "@container relative flex h-full flex-col gap-0 overflow-hidden rounded-xl border-none bg-card ring-0 shadow-none",
        className
      )}
      {...props}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-[11px] bg-muted/40">
        <Skeleton
          animate={animate}
          variant={variant}
          className="absolute inset-0 h-full w-full rounded-none opacity-60"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 bg-card px-3 pb-3 pt-3 @max-[220px]:p-2.5 @max-[220px]:gap-1.5 sm:p-4">
        <div className="space-y-1.5 pt-0.5">
          <Skeleton
            animate={animate}
            variant={variant}
            className="h-3.5 w-[85%] rounded-sm sm:h-4"
          />
          <Skeleton
            animate={animate}
            variant={variant}
            className="h-3.5 w-[50%] rounded-sm sm:h-4"
          />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 sm:pt-3">
          <Skeleton
            animate={animate}
            variant={variant}
            className="h-5 w-20 rounded-md"
          />
          <Skeleton
            animate={animate}
            variant={variant}
            className="size-8 shrink-0 rounded-full sm:size-9"
          />
        </div>
      </div>
    </div>
  );
}

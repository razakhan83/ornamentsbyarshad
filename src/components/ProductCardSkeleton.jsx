import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProductCardSkeleton({ className, animate, variant, ...props }) {
  return (
    <div
      className={cn(
        "relative flex flex-col w-full bg-transparent border-0 shadow-none select-none",
        className
      )}
      {...props}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-[8px] bg-[#F4F2EE]">
        <Skeleton
          animate={animate}
          variant={variant}
          className="absolute inset-0 size-full rounded-[8px] opacity-60 bg-[#E8E5DF]/40"
        />
      </div>
      <div className="flex flex-col gap-1.5 pt-3 pb-1">
        <Skeleton
          animate={animate}
          variant={variant}
          className="h-3.5 w-[75%] rounded-xs bg-[#E8E5DF]/50"
        />
        <Skeleton
          animate={animate}
          variant={variant}
          className="h-3.5 w-20 rounded-xs bg-[#E8E5DF]/50"
        />
      </div>
    </div>
  );
}

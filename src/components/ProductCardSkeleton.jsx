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
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-none bg-[#F4F2EE]">
        <Skeleton
          animate={animate}
          variant={variant}
          className="absolute inset-0 h-full w-full rounded-none opacity-60 bg-[#E8E5DF]/50"
        />
      </div>
      <div className="flex flex-col gap-1.5 pt-3.5 pb-2">
        <Skeleton
          animate={animate}
          variant={variant}
          className="h-4 w-[80%] rounded-none bg-[#E8E5DF]/60"
        />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton
            animate={animate}
            variant={variant}
            className="h-4 w-24 rounded-none bg-[#E8E5DF]/60"
          />
        </div>
      </div>
    </div>
  );
}

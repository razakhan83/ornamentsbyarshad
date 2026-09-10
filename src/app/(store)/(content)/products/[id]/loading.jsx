import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="product-detail-shell bg-background">
      {/* Top Header / Breadcrumb */}
      <div className="container mx-auto max-w-7xl px-4 pb-0 pt-2 md:pt-4">
        <div className="flex items-center justify-between md:hidden">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
        <div className="hidden md:flex items-center gap-2 pb-1">
          <Skeleton className="h-4 w-12 rounded" />
          <span className="text-muted-foreground/30">/</span>
          <Skeleton className="h-4 w-16 rounded" />
          <span className="text-muted-foreground/30">/</span>
          <Skeleton className="h-4 w-28 rounded" />
          <span className="text-muted-foreground/30">/</span>
          <Skeleton className="h-4 w-40 rounded" />
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pb-12 pt-2 md:pb-16 md:pt-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8 lg:gap-10">
          
          {/* Gallery Column */}
          <div className="w-full md:w-[45%] lg:w-[42%] space-y-3">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="flex gap-2.5 overflow-hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-18 md:w-20 rounded-xl shrink-0" />
              ))}
            </div>
          </div>

          {/* Details Column */}
          <div className="w-full md:w-[55%] lg:w-[58%]">
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="space-y-2">
                <Skeleton className="h-7 sm:h-9 w-11/12 rounded-lg" />
                <Skeleton className="h-7 sm:h-9 w-3/4 rounded-lg" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="size-4 rounded-sm" />
                  ))}
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 py-1">
                <Skeleton className="h-8 w-28 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>

              <div className="h-px w-full bg-border/60" />

              {/* Pack Options */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-28 rounded-xl" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                  <Skeleton className="h-12 flex-1 rounded-xl" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>

              {/* Description Preview */}
              <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-4/6 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* You May Also Like Section */}
        <div className="mt-14 pt-8 border-t border-border/60 space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2.5 rounded-2xl border border-border/60 p-2.5">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Top Header / Breadcrumb */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-12 rounded-none" />
          <span className="text-[#8C827A]/40 text-xs">/</span>
          <Skeleton className="h-3.5 w-20 rounded-none" />
          <span className="text-[#8C827A]/40 text-xs">/</span>
          <Skeleton className="h-3.5 w-32 rounded-none" />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          
          {/* Gallery Column (5 cols on desktop) */}
          <div className="lg:col-span-6 space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-none border border-[#E8E5DF]" />
            <div className="flex gap-2.5 overflow-hidden pt-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] w-16 sm:w-20 rounded-none shrink-0" />
              ))}
            </div>
          </div>

          {/* Details Column (7 cols on desktop) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-28 rounded-none" />
              <Skeleton className="h-8 sm:h-10 w-4/5 rounded-none" />
              <div className="flex items-baseline gap-3 pt-2 pb-4 border-b border-[#E8E5DF]">
                <Skeleton className="h-8 w-36 rounded-none" />
                <Skeleton className="h-4 w-20 rounded-none" />
              </div>
            </div>

            {/* In-stock indicator */}
            <div className="flex items-center gap-2">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-3.5 w-24 rounded-none" />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>

            {/* Short Description */}
            <div className="pt-4 border-t border-[#E8E5DF] space-y-2">
              <Skeleton className="h-3.5 w-full rounded-none" />
              <Skeleton className="h-3.5 w-5/6 rounded-none" />
              <Skeleton className="h-3.5 w-2/3 rounded-none" />
            </div>
          </div>
        </div>

        {/* Details Tabs Skeleton */}
        <div className="mt-14 max-w-4xl mx-auto border-t border-[#E8E5DF] divide-y divide-[#E8E5DF]">
          <div className="py-4 flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-none" />
            <Skeleton className="size-4 rounded-none" />
          </div>
          <div className="py-4 flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-none" />
            <Skeleton className="size-4 rounded-none" />
          </div>
          <div className="py-4 flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-none" />
            <Skeleton className="size-4 rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}


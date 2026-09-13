import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Minimal Breadcrumb */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 pt-4 pb-2">
        <Skeleton className="h-3 w-36 sm:w-48 rounded-full bg-[#E8E5DF]/40" />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 py-4 sm:py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-12">
          
          {/* Left Gallery Frame */}
          <div className="w-full md:w-[48%] lg:w-[46%] space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:rounded-3xl border border-[#E8E5DF]/50 bg-[#F4F2EE]/70" />
            <div className="hidden md:flex gap-2.5 pt-0.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] w-16 rounded-lg border border-[#E8E5DF]/40 bg-[#F4F2EE]/60" />
              ))}
            </div>
          </div>

          {/* Right Column Details */}
          <div className="w-full md:w-[52%] lg:w-[54%]">
            <div className="flex flex-col gap-3.5 max-w-lg">
              
              {/* Category & Title */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-full bg-[#E8E5DF]/50" />
                <Skeleton className="h-6 sm:h-7 w-4/5 rounded-md bg-[#E8E5DF]/60" />
                <Skeleton className="h-3 w-24 rounded-full bg-[#E8E5DF]/35" />
              </div>

              {/* Price */}
              <div className="py-1">
                <Skeleton className="h-7 w-32 rounded-md bg-[#E8E5DF]/60" />
              </div>

              {/* Stock */}
              <Skeleton className="h-3 w-16 rounded-full bg-[#E8E5DF]/40" />

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Skeleton className="h-11 w-full rounded-full bg-[#E8E5DF]/60" />
                <Skeleton className="h-11 w-full rounded-full bg-[#F4F2EE]/60 border border-[#E8E5DF]/40" />
              </div>

              {/* Minimal Accordion Placeholders */}
              <div className="divide-y divide-[#E8E5DF]/50 border-t border-[#E8E5DF]/50 pt-1 mt-3">
                <div className="py-3 flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32 rounded-sm bg-[#E8E5DF]/40" />
                  <Skeleton className="size-3.5 rounded-full bg-[#E8E5DF]/40" />
                </div>
                <div className="py-3 flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24 rounded-sm bg-[#E8E5DF]/40" />
                  <Skeleton className="size-3.5 rounded-full bg-[#E8E5DF]/40" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Top Breadcrumb */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12 rounded-sm" />
          <span className="text-[#8C827A]/30 text-xs">/</span>
          <Skeleton className="h-3 w-20 rounded-sm" />
          <span className="text-[#8C827A]/30 text-xs">/</span>
          <Skeleton className="h-3 w-24 rounded-sm" />
          <span className="text-[#8C827A]/30 text-xs">/</span>
          <Skeleton className="h-3 w-36 rounded-sm" />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-12">
          
          {/* Left Gallery Column */}
          <div className="w-full md:w-[48%] lg:w-[46%] space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl sm:rounded-3xl border border-[#E8E5DF] bg-[#F4F2EE]" />
            <div className="hidden md:grid grid-cols-5 gap-3 w-full pt-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg sm:rounded-xl border border-[#E8E5DF] bg-[#F4F2EE]" />
              ))}
            </div>
          </div>

          {/* Right Product Details Column */}
          <div className="w-full md:w-[52%] lg:w-[54%]">
            <div className="flex flex-col gap-3 md:gap-3.5">
              
              {/* Category & Title */}
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded-md bg-[#F4F2EE]" />
                <Skeleton className="h-7 sm:h-8 md:h-9 w-4/5 rounded-md bg-[#F4F2EE]" />
                
                {/* Rating */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="size-3.5 rounded-xs bg-[#F4F2EE]" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-16 rounded-xs bg-[#F4F2EE]" />
                </div>
              </div>

              {/* Price Block */}
              <div className="flex items-baseline gap-3 pt-2 pb-1 border-b border-[#E8E5DF]/70">
                <Skeleton className="h-8 sm:h-9 w-36 rounded-md bg-[#F4F2EE]" />
                <Skeleton className="h-4 w-20 rounded-md bg-[#F4F2EE]" />
              </div>

              {/* In-stock indicator */}
              <div className="flex items-center gap-2 py-1">
                <Skeleton className="size-2 rounded-full bg-[#A67C52]/50" />
                <Skeleton className="h-3.5 w-24 rounded-sm bg-[#F4F2EE]" />
              </div>

              {/* CTA Action Buttons (Add to Cart, Buy Now, WhatsApp) */}
              <div className="space-y-2.5 pt-1">
                <Skeleton className="h-11.5 w-full rounded-full bg-[#E8E5DF]" />
                <Skeleton className="h-11.5 w-full rounded-full bg-[#F4F2EE] border border-[#E8E5DF]" />
                <Skeleton className="h-11.5 w-full rounded-full bg-[#F4F2EE] border border-[#E8E5DF]" />
              </div>

              {/* Trust Badges Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-10 rounded-xl bg-[#F4F2EE]" />
                <Skeleton className="h-10 rounded-xl bg-[#F4F2EE]" />
                <Skeleton className="h-10 rounded-xl bg-[#F4F2EE]" />
              </div>

              {/* Accordions (Specifications & Details) */}
              <div className="divide-y divide-[#E8E5DF] border-t border-[#E8E5DF] mt-2">
                <div className="py-3.5 flex items-center justify-between">
                  <Skeleton className="h-4 w-36 rounded-sm bg-[#F4F2EE]" />
                  <Skeleton className="size-4 rounded-full bg-[#F4F2EE]" />
                </div>
                <div className="py-3.5 flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-sm bg-[#F4F2EE]" />
                  <Skeleton className="size-4 rounded-full bg-[#F4F2EE]" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


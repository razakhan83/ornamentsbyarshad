import { Skeleton, SkeletonProvider } from "@/components/ui/skeleton";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

export function ProductsHeaderSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <div>
        <div className="products-page-bar fixed inset-x-0 top-[96px] md:top-[162px] z-30 border-b border-border/50 bg-background/86 backdrop-blur-xl translate-y-0">
          <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14">
            <div className="relative flex gap-1.5 overflow-x-hidden py-3 hide-scrollbar md:px-8">
              <Skeleton className="h-8 md:h-[40px] w-24 shrink-0 rounded-full" />
              <Skeleton className="h-8 md:h-[40px] w-30 shrink-0 rounded-full" />
              <Skeleton className="h-8 md:h-[40px] w-31 shrink-0 rounded-full" />
              <Skeleton className="h-8 md:h-[40px] w-28 shrink-0 rounded-full" />
              <Skeleton className="h-8 md:h-[40px] w-26 shrink-0 rounded-full" />
              <Skeleton className="h-8 md:h-[40px] w-32 shrink-0 rounded-full" />
            </div>
          </div>
        </div>

        <div className="h-[70px] md:h-[90px]" aria-hidden="true" />

        <div className="mx-auto w-full max-w-[1600px] mb-2 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-14 pt-3">
          <Skeleton className="products-page-meta mb-2 h-4 w-32 rounded-md" />
          <Skeleton className="products-page-heading h-9 w-44 rounded-md mt-2" />
        </div>
      </div>
    </SkeletonProvider>
  );
}

export function ProductsToolbarSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-2 md:pt-4 sm:px-6 md:px-8 lg:px-10 xl:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          {/* Left side: Filters */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-[100px] rounded-md md:hidden" />
          </div>

          {/* Right side: Sort and Layout */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-[100px] rounded-md" />
            </div>
            <div className="flex items-center gap-0.5 border-l border-border/50 pl-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonProvider>
  );
}

export function ProductsGridSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <div className="w-full">
        <ProductsGridSkeletonContent />
      </div>
    </SkeletonProvider>
  );
}

function ProductsGridSkeletonContent({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <div className="products-page-results-meta mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-14 rounded-md" />
          <Skeleton className="h-4 w-5 rounded-md" />
          <Skeleton className="h-4 w-7 rounded-md" />
          <Skeleton className="h-4 w-5 rounded-md" />
          <Skeleton className="h-4 w-7 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      </div>

      <div className="grid auto-rows-max grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </SkeletonProvider>
  );
}

export function ProductsPaginationSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <div className="products-page-footer mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-0.5">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
    </SkeletonProvider>
  );
}

export function ProductsResultsSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <ProductsToolbarSkeleton />
      <section className="mx-auto w-full max-w-[1600px] px-4 py-2 sm:px-6 md:px-8 lg:px-10 xl:px-14">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start relative">
          <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] shrink-0 gap-8 py-2">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-16" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-36" />
              </div>
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <ProductsGridSkeletonContent />
            <ProductsPaginationSkeleton />
          </div>
        </div>
      </section>
    </SkeletonProvider>
  );
}

export default function ProductsPageSkeleton({ animate, variant }) {
  return (
    <SkeletonProvider animate={animate} variant={variant}>
      <ProductsHeaderSkeleton />
      <ProductsResultsSkeleton />
    </SkeletonProvider>
  );
}

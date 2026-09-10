import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistLoading() {
  return (
    <main className="min-h-screen bg-background pb-16 pt-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-5 w-80 max-w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}

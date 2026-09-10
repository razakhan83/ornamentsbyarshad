import { Suspense } from 'react';
import { connection } from 'next/server';
import WishlistClient from './WishlistClient';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

export const metadata = {
  title: 'My Wishlist | Ornaments by Arshad',
  description: 'Review your saved luxury jewelry pieces and add them to cart anytime.',
};

export default function WishlistPage() {
  return (
    <main className="min-h-screen bg-background pb-16 pt-8">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Wishlist</h1>
          <p className="mt-2 text-muted-foreground">Saved picks ready to revisit or add straight to your cart.</p>
        </div>
        <Suspense fallback={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        }>
          <WishlistContent />
        </Suspense>
      </div>
    </main>
  );
}

async function WishlistContent() {
  await connection();
  return <WishlistClient />;
}

'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useWishlist } from '@/context/WishlistContext';

export default function WishlistClient() {
  const { items = [], isLoading } = useWishlist() || {};

  if (isLoading) {
    return (
      <div className="grid auto-rows-max grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="my-8 flex items-center justify-center p-8 bg-white border border-[#E8E5DF]">
        <Empty className="max-w-md py-6">
          <EmptyMedia>
            <div className="size-14 rounded-full bg-[#F4F2EE] flex items-center justify-center text-[#A67C52] mx-auto mb-2">
              <Heart className="size-6 stroke-[1.5]" />
            </div>
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="font-serif text-xl font-normal uppercase tracking-wide text-[#121212]">
              Your Wishlist Is Empty
            </EmptyTitle>
            <EmptyDescription className="max-w-sm mx-auto text-xs text-[#737373] mt-1">
              Save your favourite jewelry pieces and revisit them whenever you are ready to complete your look.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="mt-6">
            <Button
              render={<Link href="/products" />}
              nativeButton={false}
              className="rounded-none bg-[#121212] hover:bg-neutral-800 text-white text-xs uppercase tracking-[0.2em] font-medium h-11 px-8"
            >
              Explore Collection
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {items.map((product) => (
        <ProductCard key={product._id || product.id || product.slug} product={product} />
      ))}
    </div>
  );
}


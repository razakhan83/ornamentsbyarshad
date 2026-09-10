'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';

import ProductCard from '@/components/ProductCard';
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="aspect-[0.8] animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Empty className="surface-card rounded-2xl border border-dashed border-border py-12 px-4 text-center">
        <EmptyHeader>
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image
              src="/undraw_shopping-app_b80f.svg"
              alt="Empty wishlist illustration"
              width={200}
              height={160}
              className="h-auto w-[180px] sm:w-[200px] select-none object-contain drop-shadow-xs"
              priority
            />
          </div>
          <EmptyTitle className="text-xl sm:text-2xl font-bold text-foreground">Your wishlist is empty</EmptyTitle>
          <EmptyDescription className="max-w-sm mx-auto text-sm text-muted-foreground mt-1">
            Save the products you love and come back to them anytime to complete your purchase.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-6">
          <Button render={<Link href="/products" />} nativeButton={false} className="rounded-xl px-6 h-11">
            Explore Products
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product._id || product.id || product.slug} product={product} />
      ))}
    </div>
  );
}

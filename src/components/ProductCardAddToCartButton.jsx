'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCardAddToCartButtonClient = dynamic(
  () => import('@/components/ProductCardAddToCartButtonClient'),
  {
    loading: () => <AddToCartSkeleton mode="icon" />,
  }
);

function AddToCartSkeleton({ mode }) {
  if (mode === 'icon') {
    return (
      <Skeleton className="size-9 sm:size-10 shrink-0 rounded-full" aria-hidden="true" />
    );
  }
  return <Skeleton className="w-full h-8 sm:h-9 rounded-md" aria-hidden="true" />;
}

export default function ProductCardAddToCartButton(props) {
  return (
    <Suspense fallback={<AddToCartSkeleton mode={props.mode} />}>
      <ProductCardAddToCartButtonClient {...props} />
    </Suspense>
  );
}

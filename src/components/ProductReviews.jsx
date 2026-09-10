import Image from 'next/image';
import { Star } from 'lucide-react';

import ProductReviewsClient from '@/components/ProductReviewsClient';
import ProductReviewsList from '@/components/ProductReviewsList';
import { getApprovedReviews } from '@/lib/data';
import { cn } from '@/lib/utils';

export default async function ProductReviews({ productId, productName }) {
  const reviews = await getApprovedReviews(productId);
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 md:py-8 px-4 text-center">
        <div className="relative mb-3.5 w-36 h-28 sm:w-44 sm:h-32">
          <Image
            src="/undraw_leave-a-review_uj9v.svg"
            alt="No reviews yet"
            fill
            className="object-contain"
          />
        </div>
        <h4 className="text-base font-semibold text-foreground">No reviews yet</h4>
        <p className="mt-1 mb-4 text-sm text-muted-foreground max-w-sm">
          Be the first to review this product and share your experience!
        </p>
        <ProductReviewsClient productId={productId} productName={productName} reviewCount={0} />
      </div>
    );
  }

  const averageRating =
    reviews.length > 0 ? Math.round(reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) : 0;

  return (
    <div className="flex flex-col gap-6 pt-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex text-amber-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className={cn('size-4', index < averageRating ? 'fill-current' : 'text-muted/30')} />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {reviews.length} Verified {reviews.length === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>

        <ProductReviewsClient productId={productId} productName={productName} reviewCount={reviews.length} />
      </div>
      
      <ProductReviewsList reviews={reviews} />
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function ReviewCard({ name, body, rating, date }) {
  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-border bg-muted/35 p-4 transition-all duration-200 hover:border-primary/20">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {initial}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{name}</span>
            <span className="text-[10px] text-muted-foreground">
              {date ? new Date(date).toLocaleDateString() : ''}
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 text-accent-foreground">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={cn('size-3.5', index < rating ? 'fill-current' : 'text-muted/40')} />
          ))}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export default function ProductReviewsList({ reviews }) {
  const [visibleCount, setVisibleCount] = useState(3);

  if (!reviews || reviews.length === 0) return null;

  const displayedReviews = reviews.slice(0, visibleCount);
  const hasMore = reviews.length > visibleCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {displayedReviews.map((review) => (
          <ReviewCard
            key={review._id}
            name={review.userName}
            body={review.comment}
            rating={review.rating}
            date={review.createdAt}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="border-primary/20 text-primary hover:bg-primary/5 font-semibold"
          >
            See More Reviews ({reviews.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

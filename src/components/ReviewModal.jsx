'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Star, MessageSquare, Loader2, Package, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function ReviewModal({ isOpen, onOpenChange, order, onComplete, onAction }) {
  const [reviews, setReviews] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [actionTaken, setActionTaken] = useState(null);

  // Reset actionTaken and lock background scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      setActionTaken(null);
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  const handleOpenChange = (open) => {
    if (!open && !actionTaken) {
      onAction?.('dismiss');
    }
    onOpenChange(open);
  };

  // Initialize reviews for items that haven't been reviewed
  useEffect(() => {
    if (order && order.items) {
      const initialReviews = {};
      order.items.forEach(item => {
        if (!item.isReviewed) {
          initialReviews[item.productId] = {
            productId: item.productId,
            name: item.name,
            image: item.image,
            rating: 5,
            comment: ''
          };
        }
      });
      setReviews(initialReviews);
    }
  }, [order]);

  const handleRatingChange = (productId, rating) => {
    setReviews(prev => ({
      ...prev,
      [productId]: { ...prev[productId], rating }
    }));
  };

  const handleCommentChange = (productId, comment) => {
    setReviews(prev => ({
      ...prev,
      [productId]: { ...prev[productId], comment }
    }));
  };

  const handleSubmit = async () => {
    const reviewsToSubmit = Object.values(reviews);
    if (reviewsToSubmit.length === 0) return;

    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch('/api/reviews/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order._id,
          reviews: reviewsToSubmit
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Thank you for your feedback!');
        setActionTaken('submit');
        onAction?.('submit');
        onComplete?.();
        onOpenChange(false);
      } else {
        if (data.errors) {
          const newErrors = {};
          data.errors.forEach(err => {
            newErrors[err.productId] = err.error;
          });
          setErrors(newErrors);
          toast.error('Some products could not be reviewed.');
        } else {
          toast.error(data.error || 'Failed to submit reviews');
        }
      }
    } catch (error) {
      toast.error('An error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const itemsToReview = Object.values(reviews);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl gap-0">
        <DialogHeader className="p-4 sm:p-6 border-b border-border/80 shrink-0 bg-background flex flex-row items-center justify-between gap-3">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Package className="size-5 sm:size-6 text-primary" />
              Rate Your Experience
            </DialogTitle>
            <DialogDescription className="mt-1">
              Order #{order.orderId} • {itemsToReview.length} {itemsToReview.length === 1 ? 'item' : 'items'} to review
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActionTaken('dismiss_all');
                onAction?.('dismiss_all');
                onOpenChange(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
              title="Don't ask for reviews on any order again"
            >
              Close All
            </button>
            <div className="hidden sm:flex shrink-0 items-center justify-center">
              <Image
                src="/undraw_leave-a-review_uj9v.svg"
                alt="Leave a review illustration"
                width={70}
                height={50}
                className="h-auto w-[65px] object-contain opacity-95 select-none"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain touch-pan-y divide-y divide-border/60 space-y-6">
          {itemsToReview.map((item) => (
            <div key={item.productId} className="space-y-4 pt-6 first:pt-0">
              <div className="flex gap-4">
                <div className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" unoptimized />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-semibold text-foreground text-sm line-clamp-1">{item.name}</h4>
                  
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(item.productId, star)}
                        disabled={!!errors[item.productId]}
                        className={cn(
                          "transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100",
                          item.rating >= star ? "text-amber-500" : "text-muted-foreground/30"
                        )}
                      >
                        <Star className={cn("size-6 sm:size-7", item.rating >= star && "fill-current")} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errors[item.productId] ? (
                <Alert variant="destructive" className="rounded-lg px-3 py-3 text-xs">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Review unavailable</AlertTitle>
                  <AlertDescription>{errors[item.productId]}</AlertDescription>
                </Alert>
              ) : (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`review-${item.productId}`} className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Comments</FieldLabel>
                    <FieldContent>
                      <Textarea
                        id={`review-${item.productId}`}
                        placeholder="Share your thoughts about this product..."
                        className="min-h-[80px] resize-none text-sm rounded-xl"
                        value={item.comment}
                        onChange={(e) => handleCommentChange(item.productId, e.target.value)}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-border/80 bg-muted/30 shrink-0 gap-3 m-0 rounded-none sm:rounded-b-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-6">
          <Button 
            variant="outline" 
            onClick={() => {
              setActionTaken('later');
              onAction?.('later');
              onOpenChange(false);
            }} 
            disabled={submitting}
            className="flex-1 rounded-xl h-11"
          >
            Maybe Later
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || itemsToReview.length === 0} className="flex-1 rounded-xl h-11">
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Reviews'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

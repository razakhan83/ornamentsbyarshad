'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Loader2, MessageSquarePlus, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function ProductReviewsClient({ productId, productName, reviewCount = 0 }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [guestOrderInfo, setGuestOrderInfo] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function checkPermission() {
      if (!productId) {
        setCanReview(false);
        setCheckingPermission(false);
        return;
      }

      setCheckingPermission(true);
      try {
        let url = `/api/reviews/check-permission?productId=${encodeURIComponent(productId)}`;

        // If guest, pass candidate guest orders stored in localStorage
        if (status !== 'authenticated') {
          try {
            const guestOrders = JSON.parse(localStorage.getItem('guest_orders') || '[]');
            if (guestOrders.length > 0) {
              url += `&guestOrders=${encodeURIComponent(JSON.stringify(guestOrders))}`;
            }
          } catch (e) {
            // ignore localStorage error
          }
        }

        const response = await fetch(url, { cache: 'no-store' });
        const result = await response.json();

        if (!ignore) {
          const eligible = result?.success === true && result?.canReview === true;
          setCanReview(eligible);
          
          if (eligible && result?.isGuest) {
            setGuestOrderInfo({
              orderId: result.orderId,
              secureToken: result.secureToken,
              customerName: result.customerName
            });
          }

          // Auto-popup logic if eligible and not dismissed in this session
          if (eligible) {
            const dismissedKey = `review_prompt_dismissed_${productId}`;
            const isDismissed = sessionStorage.getItem(dismissedKey);
            if (!isDismissed) {
              setModalOpen(true);
            }
          }
        }
      } catch {
        if (!ignore) {
          setCanReview(false);
        }
      } finally {
        if (!ignore) {
          setCheckingPermission(false);
        }
      }
    }

    let idleId = null;
    let timer = null;

    if (status === 'loading') {
      return () => {
        ignore = true;
      };
    }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(checkPermission, { timeout: 2500 });
    } else {
      timer = window.setTimeout(checkPermission, 1800);
    }

    return () => {
      ignore = true;
      if (idleId != null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timer != null) window.clearTimeout(timer);
    };
  }, [productId, session, status]);

  useEffect(() => {
    if (modalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [modalOpen]);

  function handleRemindLater() {
    try {
      sessionStorage.setItem(`review_prompt_dismissed_${productId}`, 'true');
    } catch (e) {
      // ignore
    }
    setModalOpen(false);
  }

  function handleCloseModal(open) {
    if (!open) {
      setModalOpen(false);
    } else {
      setModalOpen(true);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        productId,
        rating,
        comment,
      };

      if (guestOrderInfo?.orderId && guestOrderInfo?.secureToken) {
        payload.orderId = guestOrderInfo.orderId;
        payload.secureToken = guestOrderInfo.secureToken;
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to submit review');
        return;
      }

      toast.success(reviewCount > 0 ? 'Your review has been added.' : 'Thanks for being the first to review.');
      
      // Update local storage for guest orders
      try {
        const guestOrders = JSON.parse(localStorage.getItem('guest_orders') || '[]');
        const updated = guestOrders.map(o => {
          if (o.orderId === guestOrderInfo?.orderId) {
            return {
              ...o,
              items: (o.items || []).map(item => 
                item.productId === productId ? { ...item, isReviewed: true } : item
              )
            };
          }
          return o;
        });
        localStorage.setItem('guest_orders', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }

      setModalOpen(false);
      setRating(5);
      setHoverRating(0);
      setComment('');
      setCanReview(false);
      router.refresh();
    } catch {
      toast.error('An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  }

  // If user cannot review, do not display the button
  if (!canReview || checkingPermission) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        className="max-w-max border-primary/20 text-primary hover:bg-primary/5 font-semibold transition-all shadow-sm rounded-xl h-10 px-4"
        onClick={() => setModalOpen(true)}
      >
        <MessageSquarePlus className="mr-2 size-4" />
        Write a Review
      </Button>

      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your thoughts on <span className="font-semibold text-foreground">{productName}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <FieldGroup>
              <Field>
                <FieldLabel className="justify-center text-center">Rating</FieldLabel>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1;

                    return (
                      <button
                        key={index}
                        type="button"
                        className="transition-transform active:scale-95"
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(starValue)}
                      >
                        <Star
                          className={cn(
                            'size-8 transition-colors',
                            (hoverRating || rating) >= starValue
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]'
                              : 'text-muted/40'
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                <FieldDescription className="text-center">
                  Choose a star rating before submitting your review.
                </FieldDescription>
              </Field>

              {rating === 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>Select a rating</AlertTitle>
                  <AlertDescription>Please choose at least one star before submitting.</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <FieldLabel htmlFor="comment">Your Comments (Optional)</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="comment"
                    placeholder="What did you like or dislike about this product?"
                    className="min-h-[100px] rounded-xl resize-none"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleRemindLater}
                className="flex-1 h-11 rounded-xl font-semibold border-border text-muted-foreground hover:bg-muted"
                disabled={submitting}
              >
                Remind me later
              </Button>
              <Button type="submit" className="flex-1 h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

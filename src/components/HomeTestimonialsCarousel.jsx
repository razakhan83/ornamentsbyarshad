'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BadgeCheck, Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

function TestimonialCarouselArrows() {
  const { scrollPrev, scrollNext, canGoToPrev, canGoToNext } = useCarousel();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        disabled={!canGoToPrev}
        onClick={() => scrollPrev()}
        aria-label="Previous review"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        disabled={!canGoToNext}
        onClick={() => scrollNext()}
        aria-label="Next review"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

function CarouselDots({ slideCount }) {
  const { api, scrollTo } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      try {
        const snap = api.selectedScrollSnap ? api.selectedScrollSnap() : (api.selectedSnap ? api.selectedSnap() : 0);
        setSelectedIndex(snap % (slideCount || 1));
      } catch {
        // ignore
      }
    };

    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);

    return () => {
      try {
        api.off('select', onSelect);
        api.off('reInit', onSelect);
      } catch {
        // ignore
      }
    };
  }, [api, slideCount]);

  if (slideCount <= 1) return null;

  const handleGoTo = (idx) => {
    try {
      if (api && typeof api.scrollTo === 'function') {
        api.scrollTo(idx);
      } else if (typeof scrollTo === 'function') {
        scrollTo(idx);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative z-30 mt-6 flex items-center justify-center gap-0.5 pt-1">
      {Array.from({ length: slideCount }, (_, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={`Go to review ${idx + 1}`}
          onClick={() => handleGoTo(idx)}
          className="flex min-h-[28px] min-w-[28px] items-center justify-center cursor-pointer p-0 border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
        >
          <span
            className={cn(
              'rounded-full transition-all duration-300 ease-out pointer-events-none block',
              idx === selectedIndex
                ? 'w-4 h-1.5 bg-primary'
                : 'size-1.5 bg-primary/25 hover:bg-primary/50'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function HomeTestimonialsCarousel({
  reviews = [],
  title = 'Customer Reviews',
  description = '',
}) {
  const [emblaApi, setEmblaApi] = useState(null);
  const isInViewportRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isTouchPausedRef = useRef(false);
  const autoplayTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const wrapperRef = useRef(null);

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const isInteractive = reviewCount > 1;

  useEffect(() => {
    if (!emblaApi || !isInteractive) return;

    const stopAutoplay = () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };

    const clearResumeTimer = () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    };

    const advance = () => {
      if (!emblaApi) return;
      if (typeof emblaApi.scrollNext === 'function') {
        emblaApi.scrollNext();
      } else if (typeof emblaApi.goToNext === 'function') {
        emblaApi.goToNext();
      }
    };

    // Evaluates all play conditions: viewport, hover, touch pause, tab visibility
    const updateAutoplayState = () => {
      const isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true;
      const shouldPlay =
        isInViewportRef.current &&
        !isHoveredRef.current &&
        !isTouchPausedRef.current &&
        isDocumentVisible;

      if (shouldPlay) {
        if (!autoplayTimerRef.current) {
          autoplayTimerRef.current = setInterval(advance, 8000);
        }
      } else {
        stopAutoplay();
      }
    };

    // Called on touch/pointer interaction — pauses and resumes after 10s idle
    const onPointerDown = () => {
      isTouchPausedRef.current = true;
      stopAutoplay();
      clearResumeTimer();
      resumeTimerRef.current = setTimeout(() => {
        isTouchPausedRef.current = false;
        updateAutoplayState();
      }, 10000);
    };

    // Desktop hover pause
    const el = wrapperRef.current;
    const onMouseEnter = () => {
      isHoveredRef.current = true;
      stopAutoplay();
    };

    const onMouseLeave = () => {
      isHoveredRef.current = false;
      updateAutoplayState();
    };

    // Tab visibility pause
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAutoplay();
        clearResumeTimer();
      } else {
        updateAutoplayState();
      }
    };

    // IntersectionObserver: auto play only when in view
    let observer = null;
    if (typeof IntersectionObserver !== 'undefined' && el) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const isVisible = Boolean(entry && entry.isIntersecting);
          isInViewportRef.current = isVisible;

          if (!isVisible) {
            isTouchPausedRef.current = false;
            clearResumeTimer();
            stopAutoplay();
          } else {
            updateAutoplayState();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    } else {
      isInViewportRef.current = true;
      updateAutoplayState();
    }

    emblaApi.on('pointerDown', onPointerDown);
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

    if (el) {
      el.addEventListener('mouseenter', onMouseEnter, { passive: true });
      el.addEventListener('mouseleave', onMouseLeave, { passive: true });
    }

    return () => {
      stopAutoplay();
      clearResumeTimer();
      if (emblaApi && typeof emblaApi.off === 'function') {
        emblaApi.off('pointerDown', onPointerDown);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (observer) {
        observer.disconnect();
      }
      if (el) {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [emblaApi, isInteractive]);

  if (reviewCount === 0) {
    return null;
  }

  return (
    <section
      ref={wrapperRef}
      className="border-t border-border/60 bg-muted/15 py-10 md:py-14"
      style={{ isolation: 'isolate' }}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <Carousel
          setApi={setEmblaApi}
          opts={{
            align: 'start',
            loop: reviewCount > 2,
            watchDrag: true,
            duration: 25,
          }}
          className="flex flex-col"
        >
          {/* Section Header with Arrows */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[1.25rem] leading-tight font-bold tracking-[-0.03em] text-primary [text-wrap:balance] sm:text-[1.5rem] md:text-[2.1rem]">
                {title || 'Customer Reviews'}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>

            {isInteractive ? <TestimonialCarouselArrows /> : null}
          </div>

          {/* Review Cards */}
          <CarouselContent className="-ml-3 md:-ml-4" viewportClassName="overflow-hidden">
            {reviews.map((review) => {
              const rating = Math.min(5, Math.max(1, Number(review.rating || 5)));

              return (
                <CarouselItem
                  key={review._id}
                  className="pl-3 basis-[88%] sm:basis-[50%] lg:basis-[33.33%] md:pl-4"
                >
                  <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-none transition-colors">
                    <div className="flex flex-col gap-2">
                      {/* Top: Customer Name + Verified Buyer Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-foreground">
                          {review.userName || 'Customer'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-primary">
                          <BadgeCheck className="size-[18px] shrink-0 fill-primary text-background stroke-[2.2]" />
                          <span>Verified Buyer</span>
                        </span>
                      </div>

                      {/* Rating Stars */}
                      <div
                        role="img"
                        className="flex items-center gap-1 mt-0.5"
                        aria-label={`${rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              'size-4',
                              index < rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-muted text-muted-foreground/25'
                            )}
                          />
                        ))}
                      </div>

                      {/* Review Text */}
                      <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-foreground/80">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    </div>

                    {/* Bottom: Product Name (plain text, no link) */}
                    {review.productName ? (
                      <div className="mt-4 border-t border-border/70 pt-2.5 text-xs text-muted-foreground">
                        <span className="block truncate font-medium" title={review.productName}>
                          {review.productName}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Carousel Pagination Dots */}
          <CarouselDots slideCount={reviewCount} />
        </Carousel>
      </div>
    </section>
  );
}

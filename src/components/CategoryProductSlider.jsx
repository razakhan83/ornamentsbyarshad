'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel';

// ─── Arrow Buttons ────────────────────────────────────────────────────────────

function CarouselArrows() {
  const { scrollPrev, scrollNext, canGoToPrev, canGoToNext } = useCarousel();
  return (
    <div className="hidden md:flex items-center gap-2">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none"
        disabled={!canGoToPrev}
        onClick={() => scrollPrev()}
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none"
        disabled={!canGoToNext}
        onClick={() => scrollNext()}
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

// ─── Carousel Dots ────────────────────────────────────────────────────────────

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
    <div className="relative z-30 mt-5 flex items-center justify-center gap-0.5 pt-2 pb-1">
      {Array.from({ length: slideCount }, (_, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={`Go to slide page ${idx + 1}`}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryProductSlider({ categoryLabel, children, viewAllHref }) {
  const slides = Array.isArray(children)
    ? children.flat().filter(Boolean)
    : children
    ? [children]
    : [];
  const slideCount = slides.length;
  const isInteractive = slideCount >= 5;

  // All hooks must be before any early return
  const [emblaApi, setEmblaApi] = useState(null);

  // Visibility & interaction flags stored in refs to avoid re-renders
  const isInViewportRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isTouchPausedRef = useRef(false);

  // Timer refs
  const autoplayTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const wrapperRef = useRef(null);

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
      emblaApi.goToNext();
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

    // Tab visibility pause (saves battery and resources on inactive tabs)
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAutoplay();
        clearResumeTimer();
      } else {
        updateAutoplayState();
      }
    };

    // ── IntersectionObserver: freeze & pause when carousel is off-screen ─────
    let observer = null;
    if (typeof IntersectionObserver !== 'undefined' && el) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const isVisible = Boolean(entry && entry.isIntersecting);
          isInViewportRef.current = isVisible;

          if (!isVisible) {
            // Immediately freeze off-screen sliders
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
      // Fallback for environments without IntersectionObserver
      isInViewportRef.current = true;
      updateAutoplayState();
    }

    // Wire up listeners
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

  // Early return AFTER all hooks
  if (slideCount === 0) return null;

  return (
    <div
      className="w-full"
      ref={wrapperRef}
      style={{ isolation: 'isolate' }}
    >
      <Carousel
        setApi={setEmblaApi}
        opts={{
          align: 'start',
          loop: true,
          watchDrag: true,
          duration: 25,
        }}
        className="w-full"
      >
        {/* Section header */}
        <div className="mb-3 md:mb-6 flex items-center justify-between gap-4 md:items-end">
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.25rem] leading-tight font-bold tracking-[-0.03em] text-primary [text-wrap:balance] sm:text-[1.5rem] md:text-[2.1rem]">
              {categoryLabel}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isInteractive && <CarouselArrows />}
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-primary/15 bg-background/80 bg-clip-padding px-3 text-[13px] font-semibold text-primary outline-none select-none shadow-[0_12px_30px_rgba(10,61,46,0.08)] transition-[transform,background-color,color,box-shadow] duration-300 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_16px_36px_rgba(10,61,46,0.14)] active:scale-[0.96] md:hidden'
                )}
              >
                View All
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Slides */}
        <CarouselContent className="-ml-3 md:-ml-4" viewportClassName="pt-6 pb-6 -mt-6 -mb-6">
          {slides.map((slide, idx) => (
            <CarouselItem
              key={`product-slide-${idx}`}
              className="pl-3 md:pl-4 basis-[50%] md:basis-[33.33%] lg:basis-[25%]"
            >
              <div className="h-full min-w-0 pb-1">{slide}</div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Carousel Dots */}
        <CarouselDots slideCount={slideCount} />
      </Carousel>

      {/* Desktop "View All" */}
      {viewAllHref ? (
        <div className="mt-6 hidden justify-center md:flex">
          <Link
            href={viewAllHref}
            className={cn(
              'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/15 bg-background/80 bg-clip-padding px-5 text-sm font-semibold text-primary outline-none select-none shadow-[0_12px_30px_rgba(10,61,46,0.08)] transition-[transform,background-color,color,box-shadow] duration-300 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:shadow-[0_16px_36px_rgba(10,61,46,0.14)] active:scale-[0.96]'
            )}
          >
            View All
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

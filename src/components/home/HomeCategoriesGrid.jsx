'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import SectionDoodleBackground from '@/components/home/SectionDoodleBackground';
import CategoryPillCard from '@/components/home/CategoryPillCard';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel';

function CategoryCarouselArrows() {
  const { scrollPrev, scrollNext, canGoToPrev, canGoToNext } = useCarousel();
  return (
    <div className="hidden md:flex items-center gap-2">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        disabled={!canGoToPrev}
        onClick={() => scrollPrev()}
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full border border-primary/15 bg-background/80 text-primary shadow-[0_4px_12px_rgba(10,61,46,0.06)] transition-transform hover:scale-105 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        disabled={!canGoToNext}
        onClick={() => scrollNext()}
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

function CarouselDots({ slideCount = 8 }) {
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
    <div className="relative z-30 mt-4 flex items-center justify-center gap-0.5 pt-1">
      {Array.from({ length: slideCount }, (_, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={`Go to category ${idx + 1}`}
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

export default function HomeCategoriesGrid({ title = 'Shop by Category', categories = [] }) {
  const displayedCategories = Array.isArray(categories) ? categories.slice(0, 8) : [];
  if (displayedCategories.length === 0) return null;

  return (
    <section className="relative border-b border-border bg-card/70 py-6 md:py-8">
      <SectionDoodleBackground categoryLabel={title} />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <Carousel
          opts={{
            align: 'start',
            loop: displayedCategories.length > 5,
            watchDrag: true,
            duration: 25,
          }}
          className="w-full"
        >
          {/* Section Header */}
          <div className="mb-3 md:mb-6 flex items-center justify-between gap-4 md:items-end">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.25rem] leading-tight font-bold tracking-[-0.03em] text-primary [text-wrap:balance] sm:text-[1.5rem] md:text-[2.1rem]">
                {title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {displayedCategories.length > 1 ? <CategoryCarouselArrows /> : null}
              <Link
                href="/categories"
                prefetch={false}
                className="inline-flex h-8 md:h-10 shrink-0 items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap rounded-lg border border-primary/20 bg-background px-3 md:px-4 text-[13px] md:text-sm font-semibold text-primary outline-none select-none shadow-xs transition-[transform,background-color,color,border-color] duration-200 focus-visible:border-ring focus-visible:ring-2 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-[0.97]"
              >
                <span>View All</span>
                <ArrowRight className="ml-1 size-3.5 md:size-4" />
              </Link>
            </div>
          </div>

          {/* Carousel Slides */}
          <CarouselContent className="-ml-3 md:-ml-4" viewportClassName="pt-4 pb-4 -mt-4 -mb-4 overflow-hidden">
            {displayedCategories.map((category, index) => (
              <CarouselItem
                key={`${category._id || category.id}-${index}`}
                className="pl-3 md:pl-4 basis-[42%] sm:basis-[28%] md:basis-[20%] lg:basis-[16.66%]"
              >
                <div className="h-full min-w-0">
                  <CategoryPillCard category={category} index={index} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Carousel Pagination Dots */}
          <CarouselDots slideCount={displayedCategories.length} />
        </Carousel>
      </div>
    </section>
  );
}

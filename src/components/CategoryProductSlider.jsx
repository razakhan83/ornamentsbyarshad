'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from '@/components/ui/carousel';

function CarouselArrows() {
  const { scrollPrev, scrollNext, canGoToPrev, canGoToNext } = useCarousel();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-[#121212]/20 bg-white text-[#121212] transition-all duration-200 hover:bg-[#121212] hover:text-white hover:border-[#121212] disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-[0.96] shadow-xs"
        disabled={!canGoToPrev}
        onClick={() => scrollPrev()}
        aria-label="Previous products in collection"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-[#121212]/20 bg-white text-[#121212] transition-all duration-200 hover:bg-[#121212] hover:text-white hover:border-[#121212] disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-[0.96] shadow-xs"
        disabled={!canGoToNext}
        onClick={() => scrollNext()}
        aria-label="Next products in collection"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

function CarouselDots() {
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);

  useEffect(() => {
    if (!api) return;

    const onInit = () => {
      const snaps = typeof api.snapList === 'function'
        ? api.snapList()
        : typeof api.scrollSnapList === 'function'
        ? api.scrollSnapList()
        : [];
      const current = typeof api.selectedSnap === 'function'
        ? api.selectedSnap()
        : typeof api.selectedScrollSnap === 'function'
        ? api.selectedScrollSnap()
        : 0;
      setScrollSnaps(snaps);
      setSelectedIndex(current);
    };

    const onSelect = () => {
      const current = typeof api.selectedSnap === 'function'
        ? api.selectedSnap()
        : typeof api.selectedScrollSnap === 'function'
        ? api.selectedScrollSnap()
        : 0;
      setSelectedIndex(current);
    };

    onInit();
    api.on('init', onInit);
    api.on('reInit', onInit);
    api.on('select', onSelect);

    return () => {
      api.off('init', onInit);
      api.off('reInit', onInit);
      api.off('select', onSelect);
    };
  }, [api]);

  if (!scrollSnaps || scrollSnaps.length <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-1.5 mt-3.5 sm:mt-4">
      {scrollSnaps.map((_, index) => (
        <button
          key={`product-dot-${index}`}
          type="button"
          aria-label={`Go to slide ${index + 1}`}
          onClick={() => {
            if (typeof api?.goTo === 'function') {
              api.goTo(index);
            } else if (typeof api?.scrollTo === 'function') {
              api.scrollTo(index);
            }
          }}
          className="flex min-h-[28px] min-w-[28px] -m-1 items-center justify-center cursor-pointer p-0 border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#121212]/50 rounded-full"
        >
          <span
            className={cn(
              "h-1.5 sm:h-2 rounded-full transition-all duration-300 pointer-events-none block",
              selectedIndex === index
                ? "w-6 sm:w-7 bg-[#121212]"
                : "w-1.5 sm:w-2 bg-[#121212]/20 hover:bg-[#121212]/50"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function CategoryProductSlider({ categoryLabel, children, viewAllHref }) {
  const slides = Array.isArray(children)
    ? children.flat().filter(Boolean)
    : children
    ? [children]
    : [];
  const slideCount = slides.length;
  if (slideCount === 0) return null;

  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: 'start',
          loop: false,
          watchDrag: true,
          duration: 20,
        }}
        className="w-full"
      >
        {/* Section Header */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4 pb-2 border-b border-[#E8E5DF]/60">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-[#121212] uppercase">
              {categoryLabel}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <CarouselArrows />
          </div>
        </div>

        {/* 1-Row Products Carousel */}
        <CarouselContent className="-ml-3 md:-ml-4 py-1 touch-pan-y" style={{ touchAction: 'pan-y' }}>
          {slides.map((slide, idx) => (
            <CarouselItem
              key={`product-slide-${idx}`}
              className="pl-3 md:pl-4 basis-[50%] sm:basis-[36%] md:basis-[28%] lg:basis-[22%] xl:basis-[20%]"
            >
              <div className="h-full min-w-0">{slide}</div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Indicator dots for sliding products */}
        <CarouselDots />

        {/* Centered Minimal View All Link Below Products */}
        {viewAllHref ? (
          <div className="mt-3.5 sm:mt-5 flex justify-center">
            <Link
              href={viewAllHref}
              prefetch={false}
              className="inline-flex items-center justify-center gap-1.5 py-1 text-[10.5px] sm:text-[11.5px] font-sans uppercase tracking-[0.22em] font-medium text-[#121212]/80 hover:text-[#A67C52] border-b border-[#121212]/30 hover:border-[#A67C52] transition-all group"
            >
              <span>View All</span>
              <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}
      </Carousel>
    </div>
  );
}


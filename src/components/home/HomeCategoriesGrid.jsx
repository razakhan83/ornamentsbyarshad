'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-[#121212]/20 bg-white text-[#121212] transition-all duration-200 hover:bg-[#121212] hover:text-white hover:border-[#121212] disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-[0.96] shadow-xs"
        disabled={!canGoToPrev}
        onClick={() => scrollPrev()}
        aria-label="Previous collections"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-[#121212]/20 bg-white text-[#121212] transition-all duration-200 hover:bg-[#121212] hover:text-white hover:border-[#121212] disabled:opacity-20 disabled:pointer-events-none cursor-pointer active:scale-[0.96] shadow-xs"
        disabled={!canGoToNext}
        onClick={() => scrollNext()}
        aria-label="Next collections"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

export default function HomeCategoriesGrid({ title = 'Collections', categories = [] }) {
  const displayedCategories = Array.isArray(categories) ? categories.slice(0, 10) : [];
  if (displayedCategories.length === 0) return null;

  const [emblaApi, setEmblaApi] = useState(null);

  const displayTitle = (title && !title.toLowerCase().includes('shop by') && !title.toLowerCase().includes('our collections'))
    ? title
    : 'Collections';

  return (
    <section className="relative bg-[#FAF9F6] py-6 sm:py-10">
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10">
        <Carousel
          setApi={setEmblaApi}
          opts={{
            align: 'start',
            loop: false,
            watchDrag: true,
            duration: 20,
          }}
          className="w-full"
        >
          {/* Section Header: Clean Title on Left, Arrows on Right */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4 pb-2 border-b border-[#E8E5DF]/60">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-wide text-[#121212] uppercase">
                {displayTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <CategoryCarouselArrows />
            </div>
          </div>

          {/* Horizontal Scrollable Row for Mobile & PC - Sleeker compact sizing */}
          <CarouselContent className="-ml-3 md:-ml-4 py-1">
            {displayedCategories.map((category, index) => (
              <CarouselItem
                key={`${category._id || category.id}-${index}`}
                className="pl-3 md:pl-4 basis-[42%] sm:basis-[30%] md:basis-[22%] lg:basis-[17%] xl:basis-[15%]"
              >
                <div className="h-full min-w-0">
                  <CategoryPillCard category={category} index={index} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Minimal Clean View All Link Below */}
          <div className="mt-5 sm:mt-7 flex justify-center">
            <Link
              href="/categories"
              prefetch={false}
              className="inline-flex items-center justify-center gap-1.5 py-1 text-[10.5px] sm:text-[11.5px] font-sans uppercase tracking-[0.22em] font-medium text-[#121212]/80 hover:text-[#A67C52] border-b border-[#121212]/30 hover:border-[#A67C52] transition-all group"
            >
              <span>View All</span>
              <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Carousel>
      </div>
    </section>
  );
}


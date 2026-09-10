'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import SectionDoodleBackground from '@/components/home/SectionDoodleBackground';

function ScrollableBannerCard({ banner, index }) {
  if (!banner?.image?.url) return null;

  const frame = (
    <div className="relative aspect-[16/7] overflow-hidden rounded-[1.75rem] bg-muted shadow-[0_18px_42px_rgba(10,61,46,0.09)]">
      <Image
        src={optimizeCloudinaryUrl(banner.image.url, CLOUDINARY_IMAGE_PRESETS.storeBanner)}
        alt={banner.alt || `Scrollable banner ${index + 1}`}
        fill
        sizes="(max-width: 768px) 88vw, (max-width: 1280px) 58vw, 42vw"
        loading="lazy"
        className="object-cover transition-transform duration-500 hover:scale-[1.02]"
        {...getBlurPlaceholderProps(banner.image.blurDataURL)}
      />
    </div>
  );

  return (
    <article className="min-w-[88%] scroll-ml-4 snap-start sm:min-w-[68%] lg:min-w-[44%]">
      {banner.link ? (
        <Link href={banner.link} prefetch={false} className="block">
          {frame}
        </Link>
      ) : (
        frame
      )}
    </article>
  );
}

export default function HomeScrollableBannerCarousel({
  title = '',
  description = '',
  banners = [],
}) {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleBanners = Array.isArray(banners)
    ? banners.filter((banner) => banner?.image?.url)
    : [];

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;

    let rAF = null;

    const updateScrollState = () => {
      if (rAF !== null) return;

      rAF = window.requestAnimationFrame(() => {
        rAF = null;
        if (!carouselRef.current) return;
        const el = carouselRef.current;
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        const nextCanLeft = el.scrollLeft > 8;
        const nextCanRight = maxScrollLeft - el.scrollLeft > 8;

        setCanScrollLeft((prev) => (prev !== nextCanLeft ? nextCanLeft : prev));
        setCanScrollRight((prev) => (prev !== nextCanRight ? nextCanRight : prev));
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(updateScrollState);
    } else {
      setTimeout(updateScrollState, 150);
    }

    carousel.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });

    return () => {
      carousel.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      if (rAF !== null) window.cancelAnimationFrame(rAF);
    };
  }, [visibleBanners.length]);

  if (visibleBanners.length === 0) return null;

  function scrollBanners(direction) {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const distance = Math.max(carousel.clientWidth * 0.78, 260);
    carousel.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }

  return (
    <section className="relative bg-white py-8 md:py-10">
      <SectionDoodleBackground categoryLabel={title} />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        {(title || description) ? (
          <div className="mb-4 max-w-2xl">
            {title ? (
              <h2 className="text-[1.7rem] font-bold tracking-[-0.05em] text-primary [text-wrap:balance] md:text-[2.15rem]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground [text-wrap:pretty] md:text-base">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="relative">
          <div
            ref={carouselRef}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={title || 'Scrollable banner carousel'}
          >
            {visibleBanners.map((banner, index) => (
              <ScrollableBannerCard
                key={`${banner.image.url}-${index}`}
                banner={banner}
                index={index}
              />
            ))}
          </div>

          {visibleBanners.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Scroll banners left"
                onClick={() => scrollBanners('left')}
                disabled={!canScrollLeft}
                className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/92 text-foreground shadow-[0_12px_24px_rgba(10,61,46,0.16)] backdrop-blur-sm transition hover:scale-[1.03] hover:bg-white disabled:pointer-events-none disabled:opacity-0 lg:flex"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Scroll banners right"
                onClick={() => scrollBanners('right')}
                disabled={!canScrollRight}
                className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/92 text-foreground shadow-[0_12px_24px_rgba(10,61,46,0.16)] backdrop-blur-sm transition hover:scale-[1.03] hover:bg-white disabled:pointer-events-none disabled:opacity-0 lg:flex"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

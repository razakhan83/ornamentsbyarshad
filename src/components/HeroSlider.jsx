'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { optimizeCloudinaryUrl, CLOUDINARY_IMAGE_PRESETS } from '@/lib/cloudinaryImage';

const HERO_AUTOPLAY_DELAY_MS = 5000;
const HERO_SWIPE_THRESHOLD_PX = 40;

function extractSlideImages(slide) {
  const desktopAsset = slide?.desktopImage || null;
  const mobileAsset = slide?.mobileImage || null;
  const mobileVideoAsset = slide?.mobileVideo || null;

  const rawDesktopSrc =
    (typeof desktopAsset === 'string' ? desktopAsset : desktopAsset?.url || desktopAsset?.image?.url) ||
    slide?.pcSrc ||
    slide?.desktopSrc ||
    '';

  const rawMobileSrc =
    (typeof mobileAsset === 'string' ? mobileAsset : mobileAsset?.url || mobileAsset?.image?.url) ||
    slide?.mobileSrc ||
    '';

  const mobileVideoSrc =
    (typeof mobileVideoAsset === 'string' ? mobileVideoAsset : mobileVideoAsset?.url) ||
    slide?.mobileVideoUrl ||
    '';

  const fallbackSrc = rawDesktopSrc || rawMobileSrc || slide?.image || slide?.src || '';

  const desktopSrc = rawDesktopSrc || fallbackSrc;
  const mobileSrc = rawMobileSrc || fallbackSrc;

  return {
    desktopSrc,
    desktopBlur: desktopAsset?.blurDataURL || slide?.blurDataURL || '',
    mobileSrc,
    mobileBlur: mobileAsset?.blurDataURL || desktopAsset?.blurDataURL || slide?.blurDataURL || '',
    mobileVideoSrc,
  };
}

function SlideFrame({ href, isActive, children }) {
  if (!href) return <>{children}</>;
  return (
    <Link
      href={href}
      prefetch={false}
      tabIndex={isActive ? 0 : -1}
      aria-hidden={!isActive}
      className="block h-full w-full"
    >
      {children}
    </Link>
  );
}

function isNearbySlide(index, activeIndex, total) {
  if (total <= 1) return true;
  if (index === 0) return true;
  if (index === activeIndex) return true;
  if (index === (activeIndex + 1) % total) return true;
  if (index === (activeIndex - 1 + total) % total) return true;
  return false;
}

function optimizeCloudinaryVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url;
  if (!url.includes('/video/upload/')) return url;
  if (/\/video\/upload\/[a-z0-9_,:]+\/v[0-9]+\//.test(url)) return url;
  return url.replace('/video/upload/', '/video/upload/q_auto:good,w_640,vc_h264/');
}

function getCloudinaryVideoPoster(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return '';
  const withoutExt = url.replace(/\.[a-zA-Z0-9]+$/, '');
  if (url.includes('/video/upload/')) {
    return withoutExt.replace('/video/upload/', '/video/upload/so_0,c_fill,g_auto,w_640,q_auto,f_auto/') + '.jpg';
  }
  return withoutExt + '.jpg';
}

function getCloudinaryVideoBlur(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return '';
  const withoutExt = url.replace(/\.[a-zA-Z0-9]+$/, '');
  if (url.includes('/video/upload/')) {
    return withoutExt.replace('/video/upload/', '/video/upload/so_0,c_fill,g_auto,w_100,e_blur:800,q_auto:low,f_auto/') + '.jpg';
  }
  return withoutExt + '.jpg';
}

function HeroSlideMedia({ slide, isPriority, isActive }) {
  const desktopSrc = slide.images.desktopSrc || slide.images.mobileSrc;
  const mobileSrc = slide.images.mobileSrc || slide.images.desktopSrc;
  const rawMobileVideoSrc = slide.images.mobileVideoSrc;
  const mobileVideoSrc = useMemo(() => optimizeCloudinaryVideoUrl(rawMobileVideoSrc), [rawMobileVideoSrc]);

  const [cachedVideoSrc, setCachedVideoSrc] = useState(mobileVideoSrc);
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Persistent Cache Storage: Store video locally so subsequent opens & reloads play instantly in 0ms
  useEffect(() => {
    if (!mobileVideoSrc || typeof window === 'undefined' || !('caches' in window)) return;

    let isCancelled = false;
    const cacheName = 'ornaments-hero-video-v1';

    window.caches
      .open(cacheName)
      .then(async (cache) => {
        try {
          const match = await cache.match(mobileVideoSrc);
          if (match) {
            const blob = await match.blob();
            if (!isCancelled) {
              const blobUrl = URL.createObjectURL(blob);
              setCachedVideoSrc(blobUrl);
            }
          } else {
            fetch(mobileVideoSrc)
              .then((res) => {
                if (res.ok) cache.put(mobileVideoSrc, res.clone());
              })
              .catch(() => {});
          }
        } catch {}
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [mobileVideoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!mobileVideoSrc || !video || videoError) return;

    video.defaultMuted = true;
    video.muted = true;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isActive, mobileVideoSrc, videoError, cachedVideoSrc]);

  const desktopOptimized = optimizeCloudinaryUrl(desktopSrc, CLOUDINARY_IMAGE_PRESETS.heroFull);
  const mobileOptimized = optimizeCloudinaryUrl(mobileSrc, CLOUDINARY_IMAGE_PRESETS.heroMobile);

  const videoPoster = useMemo(() => {
    if (!mobileVideoSrc) return '';
    return getCloudinaryVideoPoster(mobileVideoSrc);
  }, [mobileVideoSrc]);

  const videoBlur = useMemo(() => {
    if (!mobileVideoSrc) return '';
    return getCloudinaryVideoBlur(mobileVideoSrc);
  }, [mobileVideoSrc]);

  if (mobileVideoSrc) {
    return (
      <div className="relative block h-full w-full overflow-hidden bg-transparent">
        {/* Desktop image: PC and desktop screens (md:) will ONLY show the desktop image, never video */}
        {desktopOptimized ? (
          <div className="hidden md:block absolute inset-0 h-full w-full">
            <Image
              src={desktopOptimized}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority={isPriority}
              fetchPriority={isPriority ? 'high' : 'auto'}
              loading={isPriority ? 'eager' : 'lazy'}
              className="object-cover"
              quality={80}
              {...getBlurPlaceholderProps(slide.images.desktopBlur || slide.images.mobileBlur)}
            />
          </div>
        ) : null}

        {/* Mobile View: Video plays first. Video's own start frame screenshot is shown blurred until video plays */}
        {!videoError ? (
          <div className="block md:hidden absolute inset-0 h-full w-full overflow-hidden bg-neutral-950">
            {/* Blur view derived directly from video's starting frame */}
            {videoPoster || videoBlur ? (
              <div
                className={`absolute inset-0 h-full w-full overflow-hidden transition-opacity duration-700 pointer-events-none ${
                  isVideoReady ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={videoBlur || videoPoster}
                  alt={slide.alt || 'Video preview'}
                  fetchPriority={isPriority ? 'high' : 'auto'}
                  loading={isPriority ? 'eager' : 'lazy'}
                  className="absolute inset-0 h-full w-full object-cover blur-md scale-105"
                />
              </div>
            ) : null}

            <video
              ref={(el) => {
                if (el) {
                  el.defaultMuted = true;
                  el.muted = true;
                }
                videoRef.current = el;
              }}
              src={cachedVideoSrc || mobileVideoSrc}
              poster={videoPoster || undefined}
              autoPlay
              loop
              muted
              playsInline
              webkit-playsinline="true"
              preload="auto"
              onPlaying={() => setIsVideoReady(true)}
              onLoadedData={() => setIsVideoReady(true)}
              onError={() => setVideoError(true)}
              className={`relative z-[1] h-full w-full object-cover transition-opacity duration-500 ${
                isVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        ) : mobileOptimized ? (
          <div className="block md:hidden absolute inset-0 h-full w-full">
            <Image
              src={mobileOptimized}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority={isPriority}
              fetchPriority={isPriority ? 'high' : 'auto'}
              loading={isPriority ? 'eager' : 'lazy'}
              className="object-cover"
              quality={80}
              {...getBlurPlaceholderProps(slide.images.mobileBlur || slide.images.desktopBlur)}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const hasDistinct =
    Boolean(
      desktopOptimized &&
      mobileOptimized &&
      desktopOptimized !== mobileOptimized
    );

  if (!hasDistinct) {
    const src = desktopOptimized || mobileOptimized;
    if (!src) {
      return <div className="h-full w-full bg-transparent" />;
    }
    const blur = slide.images.desktopBlur || slide.images.mobileBlur;
    return (
      <Image
        src={src}
        alt={slide.alt || 'Slide'}
        fill
        sizes="100vw"
        priority={isPriority}
        fetchPriority={isPriority ? 'high' : 'auto'}
        loading={isPriority ? 'eager' : 'lazy'}
        className="object-cover"
        quality={80}
        {...getBlurPlaceholderProps(blur)}
      />
    );
  }

  return (
    <picture className="relative block h-full w-full">
      {desktopOptimized ? <source media="(min-width: 768px)" srcSet={desktopOptimized} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mobileOptimized}
        alt={slide.alt || 'Slide'}
        fetchPriority={isPriority ? 'high' : 'auto'}
        loading={isPriority ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

export default function HeroSlider({ slides = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const resolvedSlides = useMemo(
    () =>
      slides
        .map((slide, index) => ({
          ...slide,
          images: extractSlideImages(slide),
          alt: slide?.alt || `Slide ${index + 1}`,
        }))
        .filter((slide) => slide.images.mobileSrc || slide.images.desktopSrc || slide.images.mobileVideoSrc),
    [slides]
  );

  const safeActiveIndex =
    resolvedSlides.length > 0 ? activeIndex % resolvedSlides.length : 0;

  const goToSlide = useCallback(
    (nextIndex) => {
      if (resolvedSlides.length === 0) return;
      const normalizedIndex =
        ((nextIndex % resolvedSlides.length) + resolvedSlides.length) %
        resolvedSlides.length;
      setActiveIndex(normalizedIndex);
    },
    [resolvedSlides.length]
  );

  const goToNextSlide = useCallback(
    () => goToSlide(safeActiveIndex + 1),
    [goToSlide, safeActiveIndex]
  );

  const goToPrevSlide = useCallback(
    () => goToSlide(safeActiveIndex - 1),
    [goToSlide, safeActiveIndex]
  );

  function handleTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }

  function handleTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (!touch || startX == null || startY == null) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < HERO_SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0) goToNextSlide();
    else goToPrevSlide();
  }

  if (resolvedSlides.length === 0) {
    return (
      <section className="relative w-full overflow-hidden bg-transparent px-3 sm:px-5 md:px-6 lg:px-8 pt-2.5 sm:pt-3.5 md:pt-4 pb-2">
        <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[680px] w-full flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl bg-[#121212]">
          <Image
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1920&q=85"
            alt="Ornaments by Arshad Luxury High Jewelry"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60 scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center text-white space-y-5 sm:space-y-6">
            <span className="inline-block text-[11px] sm:text-xs font-sans uppercase tracking-[0.28em] text-[#e8dfd5] font-semibold">
              Exquisite High Jewelry
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-wide font-normal leading-[1.15] text-white">
              Handcrafted Elegance, <br className="hidden sm:inline" />
              <span className="italic font-light text-[#faf8f5]">Timeless Legacy</span>
            </h1>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-neutral-300 font-sans tracking-wide leading-relaxed">
              Discover certified diamond creations, 22K pure gold heirlooms, and bespoke bridal masterworks crafted with generational perfection.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-[#121212] px-8 py-3.5 sm:py-4 text-xs font-sans uppercase tracking-[0.2em] font-semibold rounded-none hover:bg-[#a67c52] hover:text-white transition-all duration-300 active:scale-[0.98]"
              >
                Explore Collection
              </Link>
              <Link
                href="/about-us"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-transparent border border-white/60 text-white px-8 py-3.5 sm:py-4 text-xs font-sans uppercase tracking-[0.2em] font-semibold rounded-none hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
              >
                Our Heritage
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="hero-main-slider"
      className="relative w-full overflow-hidden bg-transparent px-3 sm:px-5 md:px-6 lg:px-8 pt-2.5 sm:pt-3.5 md:pt-4 pb-2"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[58vh] min-h-[400px] w-full overflow-hidden rounded-2xl sm:rounded-3xl md:h-[540px] lg:h-[680px] bg-transparent">
        {resolvedSlides.map((slide, index) => {
          const isActive = safeActiveIndex === index;
          return (
            <div
              key={slide.id || `${slide.images.mobileSrc}-${index}`}
              className={`hero-fade-slide ${isActive ? 'is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <SlideFrame href={slide.link} isActive={isActive}>
                <div className="relative h-full w-full">
                  {isNearbySlide(index, safeActiveIndex, resolvedSlides.length) ? (
                    <HeroSlideMedia slide={slide} isPriority={index === 0} isActive={isActive} />
                  ) : null}
                </div>
              </SlideFrame>
            </div>
          );
        })}

        {/* Prev/Next arrows — desktop only */}
        {resolvedSlides.length > 1 ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-4 md:flex lg:px-6">
            <button
              type="button"
              onClick={goToPrevSlide}
              className="hero-slider-control pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goToNextSlide}
              className="hero-slider-control pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        ) : null}

        {/* Dot indicators */}
        {resolvedSlides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-5 z-10 flex justify-center gap-1">
            {resolvedSlides.map((slide, index) => (
              <button
                key={slide.id || `dot-${index}`}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goToSlide(index)}
                className="flex min-h-[32px] min-w-[32px] -m-1 items-center justify-center cursor-pointer p-0 border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-full"
              >
                <span
                  className={`h-2 rounded-full shadow-md transition-all duration-300 origin-center pointer-events-none block ${
                    safeActiveIndex === index ? 'w-8 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                  }`}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

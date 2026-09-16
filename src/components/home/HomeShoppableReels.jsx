'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

function ReelCard({ reel, onOpenModal }) {
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const rawVideoUrl = reel?.video?.url || '';
  const optimizedVideoUrl = useMemo(() => optimizeCloudinaryVideoUrl(rawVideoUrl), [rawVideoUrl]);
  const posterUrl = useMemo(() => getCloudinaryVideoPoster(rawVideoUrl), [rawVideoUrl]);
  const blurUrl = useMemo(() => getCloudinaryVideoBlur(rawVideoUrl), [rawVideoUrl]);

  // IntersectionObserver to only stream video when card is near viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Autoplay muted when in view or hovered
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    video.defaultMuted = true;
    video.muted = true;

    if (isInView || isHovered) {
      const p = video.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView, isHovered]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onOpenModal}
      className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/10 bg-neutral-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl w-[200px] sm:w-[230px] md:w-[260px] aspect-[9/16]"
    >
      {/* Blurred starting frame placeholder */}
      {blurUrl || posterUrl ? (
        <div
          className={cn(
            'absolute inset-0 h-full w-full overflow-hidden transition-opacity duration-700 pointer-events-none z-0',
            isVideoReady ? 'opacity-0' : 'opacity-100'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blurUrl || posterUrl}
            alt={reel.title || 'Reel preview'}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover blur-md scale-105"
          />
        </div>
      ) : null}

      {/* Video Element (rendered when near viewport) */}
      {isInView && optimizedVideoUrl ? (
        <video
          ref={videoRef}
          src={optimizedVideoUrl}
          poster={posterUrl || undefined}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          preload="metadata"
          onPlaying={() => setIsVideoReady(true)}
          onLoadedData={() => setIsVideoReady(true)}
          className={cn(
            'relative z-[1] h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
            isVideoReady ? 'opacity-100' : 'opacity-0'
          )}
        />
      ) : null}

      {/* Dark gradient overlay for typography readability */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

      {/* Top Header: Badge & Floating Play Icon */}
      <div className="absolute top-3 inset-x-3 z-[3] flex items-center justify-between pointer-events-none">
        {reel.badge ? (
          <Badge className="bg-black/60 text-[#e8dfd5] border border-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            {reel.badge}
          </Badge>
        ) : (
          <span />
        )}
        <div className="flex size-7 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md border border-white/20 transition-transform duration-300 group-hover:scale-110">
          <Play className="size-3 fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom Content: Reel Title & Tagged Product Pill */}
      <div className="absolute bottom-3 inset-x-3 z-[3] space-y-2 pointer-events-none">
        {reel.title ? (
          <p className="font-serif text-sm md:text-base font-medium text-white line-clamp-2 leading-snug drop-shadow-sm">
            {reel.title}
          </p>
        ) : null}

        {reel.productTitle ? (
          <div className="flex items-center gap-2 rounded-xl bg-black/70 p-1.5 pr-3 text-white backdrop-blur-md border border-white/15 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
            {reel.productImage ? (
              <img
                src={reel.productImage}
                alt={reel.productTitle}
                className="size-8 rounded-lg object-cover flex-shrink-0 border border-white/20"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-800 text-[#a67c52] flex-shrink-0">
                <ShoppingBag className="size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white/95 truncate leading-tight">
                {reel.productTitle}
              </p>
              <p className="text-[10px] font-bold text-[#e8dfd5]">
                Rs. {Number(reel.productPrice || 0).toLocaleString('en-PK')}
              </p>
            </div>
            <span className="text-[10px] font-medium text-[#a67c52] uppercase tracking-wider">
              Shop
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReelModalViewer({ reels, activeIndex, isOpen, onClose, onNavigate }) {
  const currentReel = reels[activeIndex] || null;
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const rawVideoUrl = currentReel?.video?.url || '';
  const optimizedVideoUrl = useMemo(() => optimizeCloudinaryVideoUrl(rawVideoUrl), [rawVideoUrl]);
  const posterUrl = useMemo(() => getCloudinaryVideoPoster(rawVideoUrl), [rawVideoUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setIsPlaying(true);
    setProgress(0);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = isMuted;
      const p = video.play();
      if (p !== undefined) p.catch(() => {});
    }
  }, [activeIndex, isOpen, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  if (!currentReel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md sm:max-w-lg p-0 bg-black border-neutral-800 text-white overflow-hidden rounded-3xl shadow-2xl [&>button]:hidden"
      >
        <DialogTitle className="sr-only">
          {currentReel.title || 'Shoppable Reel Video'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Watch video and shop tagged product
        </DialogDescription>

        <div className="relative w-full aspect-[9/16] max-h-[85vh] bg-black flex items-center justify-center select-none">
          {/* Top Progress Bar */}
          <div className="absolute top-0 inset-x-0 z-30 h-1 bg-white/20">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Video Player */}
          <video
            ref={videoRef}
            src={optimizedVideoUrl}
            poster={posterUrl || undefined}
            autoPlay
            loop
            playsInline
            webkit-playsinline="true"
            preload="auto"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            className="h-full w-full object-cover cursor-pointer"
          />

          {/* Controls Bar (Top) */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between">
            {currentReel.badge ? (
              <Badge className="bg-black/60 text-[#e8dfd5] border border-white/20 backdrop-blur-md px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                {currentReel.badge}
              </Badge>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 transition hover:bg-black/80 cursor-pointer"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close reel viewer"
                className="flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 transition hover:bg-black/80 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Play/Pause center overlay when paused */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 cursor-pointer"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/30">
                <Play className="size-6 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Left/Right Navigation Arrows */}
          {reels.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(-1);
                }}
                disabled={activeIndex === 0}
                aria-label="Previous reel"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 disabled:opacity-30 disabled:pointer-events-none hover:bg-black/75 cursor-pointer"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(1);
                }}
                disabled={activeIndex === reels.length - 1}
                aria-label="Next reel"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/20 disabled:opacity-30 disabled:pointer-events-none hover:bg-black/75 cursor-pointer"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Bottom Card: Product Info & Shop Button */}
          <div className="absolute bottom-3 inset-x-3 z-20 space-y-2">
            {currentReel.title ? (
              <p className="font-serif text-base font-medium text-white line-clamp-2 drop-shadow-md px-1">
                {currentReel.title}
              </p>
            ) : null}

            {currentReel.productId || currentReel.productTitle ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/80 p-2.5 sm:p-3 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {currentReel.productImage ? (
                    <img
                      src={currentReel.productImage}
                      alt={currentReel.productTitle}
                      className="size-11 sm:size-12 rounded-xl object-cover flex-shrink-0 border border-white/20"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {currentReel.productTitle}
                    </p>
                    <p className="text-xs font-bold text-[#e8dfd5]">
                      Rs. {Number(currentReel.productPrice || 0).toLocaleString('en-PK')}
                    </p>
                  </div>
                </div>

                <Link
                  href={currentReel.productSlug ? `/products/${currentReel.productSlug}` : '/products'}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#a67c52] hover:text-white transition-colors duration-200 flex-shrink-0"
                >
                  <span>Shop</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HomeShoppableReels({ title, description, reels = [] }) {
  const safeReels = Array.isArray(reels) ? reels.filter((r) => r?.video?.url) : [];
  const [modalIndex, setModalIndex] = useState(null);
  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const scrollAmount = 300 * direction;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleNavigateModal = (step) => {
    if (modalIndex === null) return;
    const next = modalIndex + step;
    if (next >= 0 && next < safeReels.length) {
      setModalIndex(next);
    }
  };

  if (!safeReels.length) return null;

  return (
    <section className="relative w-full py-6 sm:py-8 md:py-10 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-5 md:mb-6 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-[0.24em] text-[#a67c52] font-semibold">
              <Sparkles className="size-3.5" />
              Reels & Looks
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground font-normal tracking-tight">
              {title || 'Watch & Shop'}
            </h2>
            {description ? (
              <p className="text-xs sm:text-sm text-muted-foreground font-sans max-w-xl">
                {description}
              </p>
            ) : null}
          </div>

          {/* Carousel Arrows (Desktop) */}
          {safeReels.length > 3 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                aria-label="Scroll left"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                aria-label="Scroll right"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-3.5 sm:gap-4 md:gap-5 overflow-x-auto scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
        >
          {safeReels.map((reel, index) => (
            <ReelCard
              key={reel.id || index}
              reel={reel}
              onOpenModal={() => setModalIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen / Interactive Reel Modal Viewer */}
      <ReelModalViewer
        reels={safeReels}
        activeIndex={modalIndex ?? 0}
        isOpen={modalIndex !== null}
        onClose={() => setModalIndex(null)}
        onNavigate={handleNavigateModal}
      />
    </section>
  );
}

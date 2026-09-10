'use client';

import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function shouldReduceMedia() {
  if (typeof window === 'undefined') return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const slow = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return saveData || slow || reducedMotion;
}

export default function HomeVideoCatalog({ title, pcVideo, mobileVideo }) {
  const [pcLoaded, setPcLoaded] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef(null);
  const pcVideoRef = useRef(null);
  const mobileVideoRef = useRef(null);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const handler = (event) => setIsDesktop(event.matches);
    const frame = window.requestAnimationFrame(() => setIsDesktop(mql.matches));
    mql.addEventListener('change', handler);
    return () => {
      window.cancelAnimationFrame(frame);
      mql.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => {
        setShouldLoadVideo(!shouldReduceMedia());
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !shouldReduceMedia()) {
          setShouldLoadVideo(true);
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      },
      { rootMargin: '80px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = isDesktop ? pcVideoRef.current : mobileVideoRef.current;
    if (!node) return;
    if (isPlaying) {
      node.play?.().catch(() => {});
    } else {
      node.pause?.();
    }
  }, [isPlaying, isDesktop]);

  if (!pcVideo?.url && !mobileVideo?.url) return null;

  return (
    <section ref={containerRef} className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {title ? (
        <h2 className="sr-only">{title}</h2>
      ) : null}
      <div className="relative overflow-hidden rounded-2xl bg-muted/20">
        {pcVideo?.url && isDesktop && (
          <div className="relative hidden sm:block aspect-[21/9] xl:aspect-[3/1]">
            {!pcLoaded && (
              <Skeleton className="absolute inset-0 z-10 h-full w-full" />
            )}
            {shouldLoadVideo && (
              <video
                ref={pcVideoRef}
                src={pcVideo.url}
                loop
                muted
                playsInline
                preload="none"
                poster={pcVideo.poster || pcVideo.thumbnail || undefined}
                onCanPlay={() => setPcLoaded(true)}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-500",
                  pcLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            )}
          </div>
        )}

        {(mobileVideo?.url || pcVideo?.url) && !isDesktop && (
          <div className="relative sm:hidden aspect-square">
            {!mobileLoaded && (
              <Skeleton className="absolute inset-0 z-10 h-full w-full" />
            )}
            {shouldLoadVideo && (
              <video
                ref={mobileVideoRef}
                src={mobileVideo?.url || pcVideo?.url}
                loop
                muted
                playsInline
                preload="none"
                poster={mobileVideo?.poster || mobileVideo?.thumbnail || pcVideo?.poster || undefined}
                onCanPlay={() => setMobileLoaded(true)}
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-500",
                  mobileLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

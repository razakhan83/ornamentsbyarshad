'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function MarqueeTrack({ direction = 'left', children, className = '' }) {
  const containerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const animationClass = direction === 'left' ? 'animate-marquee-left-custom' : 'animate-marquee-right-custom';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => {
      if (motionQuery.matches) setPaused(true);
    };
    const frame = window.requestAnimationFrame(applyMotion);
    motionQuery.addEventListener('change', applyMotion);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPaused(!entry.isIntersecting || motionQuery.matches);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      motionQuery.removeEventListener('change', applyMotion);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn('overflow-hidden w-full relative py-1', className)}>
      <div
        className={cn('flex gap-4 md:gap-5 w-max', animationClass)}
        style={paused ? { animationPlayState: 'paused' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

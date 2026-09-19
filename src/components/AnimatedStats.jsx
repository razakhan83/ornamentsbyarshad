'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, Package, Star, ShieldCheck } from 'lucide-react';
import SectionDoodleBackground from '@/components/home/SectionDoodleBackground';
import { cn } from '@/lib/utils';

const STATS = [
  { target: 1000, label: 'Happy Customers', icon: Users, isNumeric: true, prefix: '', suffix: '+' },
  { target: 1200, label: 'Orders Delivered', icon: Package, isNumeric: true, prefix: '', suffix: '+' },
  { target: 98, label: 'Positive Reviews', icon: Star, isNumeric: true, prefix: '', suffix: '%' },
  { target: 100, label: 'Verified Quality', icon: ShieldCheck, isNumeric: true, prefix: '', suffix: '%' },
];

function StatItem({ stat }) {
  const [count, setCount] = useState(stat.isNumeric ? 0 : stat.target);
  const [hasAnimated, setHasAnimated] = useState(false);
  const itemRef = useRef(null);

  useEffect(() => {
    if (!stat.isNumeric) return;

    let observer = null;
    const startCountAnimation = () => {
      if (hasAnimated) return;
      setHasAnimated(true);

      let startTime = null;
      const duration = 1600;

      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        setCount(Math.floor(easeProgress * stat.target));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(stat.target);
        }
      };

      requestAnimationFrame(animate);
    };

    if (typeof IntersectionObserver !== 'undefined' && itemRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            startCountAnimation();
            observer.disconnect();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(itemRef.current);
    } else {
      startCountAnimation();
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [hasAnimated, stat.isNumeric, stat.target]);

  const displayValue = stat.isNumeric
    ? `${stat.prefix}${count.toLocaleString()}${stat.suffix}`
    : stat.target;

  return (
    <div
      ref={itemRef}
      className={cn(
        'flex flex-col items-center justify-center p-4 sm:p-7 md:p-8 text-center',
        'bg-card border border-border/80 rounded-sm shadow-none',
        'transition-all duration-300'
      )}
    >
      <div className="mb-2.5 sm:mb-3 flex items-center justify-center text-primary">
        <stat.icon strokeWidth={1.75} className="size-6 sm:size-7 md:size-8" />
      </div>
      <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1 md:mb-1.5 tabular-nums">
        {displayValue}
      </div>
      <div className="text-[0.72rem] sm:text-xs md:text-xs font-semibold text-muted-foreground uppercase tracking-wider max-w-[120px] md:max-w-[140px] mx-auto leading-tight">
        {stat.label}
      </div>
    </div>
  );
}

export default function AnimatedStats() {
  return (
    <section className="relative w-full bg-background py-14 sm:py-16 md:py-24 border-t border-border/40">
      <SectionDoodleBackground />
      <div className="relative z-10 container mx-auto max-w-7xl px-4">
        <div className="mb-10 sm:mb-14 md:mb-20 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground">
            Why Choose <br className="block md:hidden" />
            <span className="text-primary">Ornaments by Arshad?</span>
          </h2>
          <p className="mt-4 sm:mt-6 text-muted-foreground text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-balance">
            Your destination for <span className="font-semibold text-primary">certified fine jewelry</span> and <span className="font-semibold text-primary">heirloom craftsmanship</span>. We ensure pure gold hallmarking, certified natural gemstones, and bespoke elegance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4 md:gap-8">
          {STATS.map((stat) => (
            <StatItem key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

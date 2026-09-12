'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

function BrandFallback({ storeName = 'Ornaments by Arshad', invert = false, compact = false, scalePercent = 100 }) {
  const title = String(storeName || 'Ornaments by Arshad').trim();
  const titleClass = invert ? 'text-white' : 'text-[#121212]';
  const subtitleClass = invert ? 'text-white/70' : 'text-[#a67c52]';
  const scale = Number(scalePercent) ? Number(scalePercent) / 100 : 1;

  return (
    <div
      className="flex flex-col items-center justify-center text-center select-none py-0.5 origin-left"
      style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: 'left center' } : undefined}
    >
      <p className={cn('font-serif font-medium tracking-[0.22em] uppercase leading-tight', compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg md:text-xl', titleClass)}>
        {title}
      </p>
      <span className={cn('text-[9px] sm:text-[10px] font-sans font-medium tracking-[0.24em] uppercase mt-0.5', subtitleClass)}>
        Fine Jewelry
      </span>
    </div>
  );
}

export default function StoreLogo({
  href = '/',
  storeName = 'Ornaments by Arshad',
  lightLogoUrl = '',
  darkLogoUrl = '',
  logoScalePercent = 100,
  variant = 'dark-surface',
  className,
  priority = false,
  compact = false,
  onClick,
  isLink = true,
}) {
  const [imageError, setImageError] = useState(false);

  const prefersLightLogo = variant === 'dark-surface';
  const preferredLogoUrl = prefersLightLogo ? lightLogoUrl : darkLogoUrl;
  const fallbackLogoUrl = prefersLightLogo ? darkLogoUrl : lightLogoUrl;
  const logoUrl = String(preferredLogoUrl || '').trim() || String(fallbackLogoUrl || '').trim() || '/logo.png';
  const hasLogo = Boolean(String(logoUrl || '').trim()) && !imageError;
  const baseHeight = compact ? 38 : 46;
  const safeScalePercent = Math.min(350, Math.max(30, Number(logoScalePercent) || 100));
  const effectiveHeight = Math.round(baseHeight * (safeScalePercent / 100));

  const innerContent = (
    <>
      {hasLogo ? (
        <div
          className="flex shrink-0 items-center justify-center overflow-visible"
          style={{ height: `${effectiveHeight}px` }}
        >
          <Image
            src={logoUrl}
            alt={storeName || 'Ornaments by Arshad'}
            width={450}
            height={130}
            priority={priority}
            sizes={compact ? '180px' : '360px'}
            className="h-full w-auto max-h-full object-contain pointer-events-none"
            style={{ maxHeight: `${effectiveHeight}px` }}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <BrandFallback storeName={storeName} invert={prefersLightLogo} compact={compact} scalePercent={safeScalePercent} />
      )}
    </>
  );

  if (!isLink) {
    return (
      <div onClick={onClick} className={cn('flex min-w-0 items-center gap-3 cursor-pointer', className)}>
        {innerContent}
      </div>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={cn('flex min-w-0 items-center gap-3', className)}>
      {innerContent}
    </Link>
  );
}

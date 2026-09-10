'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

function BrandFallback({ storeName = 'Ornaments by Arshad', invert = false, compact = false }) {
  const title = String(storeName || 'Ornaments by Arshad').trim();
  const iconClass = invert ? 'bg-white/10 text-white border border-white/20' : 'bg-[#a67c52]/10 text-[#a67c52] border border-[#a67c52]/20';
  const titleClass = invert ? 'text-white' : 'text-foreground';
  const subtitleClass = invert ? 'text-white/70' : 'text-[#a67c52]';

  return (
    <>
      <div className={cn('flex items-center justify-center rounded-lg shadow-sm', compact ? 'size-10' : 'size-9', iconClass)}>
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <p className={cn('truncate font-serif font-semibold tracking-[0.05em]', compact ? 'text-base' : 'text-sm sm:text-base', titleClass)}>
          {title}
        </p>
        <p className={cn('truncate text-[10px] font-medium tracking-[0.14em] uppercase', subtitleClass)}>Timeless Luxury</p>
      </div>
    </>
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
  const logoUrl = String(preferredLogoUrl || '').trim() || String(fallbackLogoUrl || '').trim();
  const hasLogo = Boolean(String(logoUrl || '').trim()) && !imageError;
  const baseHeight = compact ? 52 : 48;
  const safeScalePercent = Math.min(200, Math.max(60, Number(logoScalePercent) || 100));
  const logoScale = 1 + ((safeScalePercent - 100) / 100) * 1.9;

  const innerContent = (
    <>
      {hasLogo ? (
        <div
          className="flex shrink-0 items-center overflow-visible"
          style={{ height: `${baseHeight}px` }}
        >
          <Image
            src={logoUrl}
            alt={storeName || 'Store logo'}
            width={264}
            height={80}
            priority={priority}
            sizes={compact ? '208px' : '192px'}
            className="h-auto w-auto object-contain origin-left-center pointer-events-none"
            style={{ height: `${baseHeight}px`, transform: `translateY(3px) scale(${logoScale})` }}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <BrandFallback storeName={storeName} invert={prefersLightLogo} compact={compact} />
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

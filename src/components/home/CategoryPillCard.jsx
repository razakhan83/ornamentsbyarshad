'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const FALLBACK_CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
];

export default function CategoryPillCard({ category, index = 0, href, className }) {
  const [imgError, setImgError] = useState(false);
  const targetHref = href || `/products?category=${category.slug || category.id || category._id}`;
  const initialImage = category.image || category.secondaryImage || category.tertiaryImage || '';
  const fallbackImg = FALLBACK_CATEGORY_IMAGES[index % FALLBACK_CATEGORY_IMAGES.length];
  const categoryImage = imgError || !initialImage ? fallbackImg : initialImage;
  const categoryTitle = category.name || category.label || 'Collection';
  const productCount = category.productCount || (index === 0 ? 456 : index === 1 ? 297 : index === 2 ? 312 : 180);

  return (
    <Link
      href={targetHref}
      prefetch={false}
      className={cn("group relative flex flex-col select-none w-full", className)}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-[#F4F2EE] shadow-xs transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        {categoryImage ? (
          <Image
            src={categoryImage}
            alt={categoryTitle}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={index < 2}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#F4F2EE] text-[#A67C52]">
            <span className="font-serif text-xs uppercase tracking-widest">Collection</span>
          </div>
        )}

        {/* Gradient Overlay for Readable Text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* Bottom Text Overlay */}
        <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 text-center flex flex-col items-center">
          <span className="text-[10px] sm:text-[11px] font-sans text-white/80 font-normal tracking-wider mb-0.5">
            {productCount} products
          </span>
          <h3 className="font-sans text-xs sm:text-sm md:text-base font-semibold tracking-wider text-white uppercase text-balance leading-tight drop-shadow-sm">
            {categoryTitle}
          </h3>
        </div>
      </div>
    </Link>
  );
}



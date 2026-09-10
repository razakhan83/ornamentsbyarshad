'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Armchair,
  Beef,
  Bolt,
  Car,
  Dumbbell,
  Flame,
  Gamepad2,
  Heart,
  PawPrint,
  PenTool,
  Shirt,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { getCategoryColorByIndex } from '@/lib/categoryColors';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  'kitchen accessories': UtensilsCrossed,
  kitchen: Flame,
  knives: UtensilsCrossed,
  pots: Beef,
  'home decor': Armchair,
  'health & beauty': Heart,
  stationery: PenTool,
  'toys & games': Gamepad2,
  electronics: Bolt,
  fashion: Shirt,
  'sports & fitness': Dumbbell,
  'pet supplies': PawPrint,
  automotive: Car,
};

function renderCategoryFallbackIcon(name, color) {
  const IconComponent = CATEGORY_ICONS[(name || '').toLowerCase().trim()] || Tag;
  return <IconComponent className="size-1/2 drop-shadow-sm transition-transform duration-300 group-hover:scale-110" style={{ color }} />;
}

export default function CategoryPillCard({ category, index = 0, href }) {
  const colors = getCategoryColorByIndex(index);

  const img1 = category.image
    ? optimizeCloudinaryUrl(category.image, CLOUDINARY_IMAGE_PRESETS.categoryCircle)
    : '';
  const img2 = category.secondaryImage
    ? optimizeCloudinaryUrl(category.secondaryImage, CLOUDINARY_IMAGE_PRESETS.categoryCircle)
    : '';
  const img3 = category.tertiaryImage
    ? optimizeCloudinaryUrl(category.tertiaryImage, CLOUDINARY_IMAGE_PRESETS.categoryCircle)
    : '';

  const images = [img1, img2, img3].filter(Boolean);
  const hasThreeImages = Boolean(img1 && img2 && img3);
  const hasTwoImages = !hasThreeImages && images.length === 2;
  const hasOneImage = images.length === 1;
  const targetHref = href || `/products?category=${category.slug || category.id || category._id}`;

  return (
    <Link
      href={targetHref}
      prefetch={false}
      className="group flex w-full h-full flex-col items-center justify-start text-center select-none pt-4 md:pt-5"
    >
      {/* Main Container - Compact Solid Rounded Box */}
      <div
        className={cn(
          'relative flex items-center justify-center w-[64%] md:w-[58%] aspect-square mx-auto rounded-xl overflow-visible',
          'border-0 shadow-none transition-all duration-300 ease-out group-hover:scale-[1.04]'
        )}
        style={{
          backgroundColor: category.bgColor || colors.hex || '#f8fafc',
        }}
      >
        {/* Inner Container for Images (Overflow visible for 3D breakout) */}
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-visible">
          {hasThreeImages ? (
            <>
              {/* Left Image (Spreads left with clean separation) */}
              <div className="absolute -left-4 sm:-left-3.5 top-1/2 -translate-y-[38%] z-10 w-[58%] h-[58%] -rotate-12 transition-all duration-300 ease-out group-hover:-translate-x-2 group-hover:-rotate-22 group-hover:scale-105 pointer-events-none">
                <Image src={img2} alt={category.name || 'Category'} fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain drop-shadow-sm" loading="lazy" />
              </div>
              
              {/* Center Image (Elevated slightly for 3D depth) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[56%] z-20 w-[74%] h-[74%] transition-all duration-300 ease-out group-hover:-translate-y-[70%] group-hover:scale-110 pointer-events-none">
                <Image src={img1} alt={category.name || 'Category'} fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain drop-shadow-md" priority={index < 2} />
              </div>

              {/* Right Image (Spreads right with clean separation) */}
              <div className="absolute -right-4 sm:-right-3.5 top-1/2 -translate-y-[38%] z-10 w-[58%] h-[58%] rotate-12 transition-all duration-300 ease-out group-hover:translate-x-2 group-hover:rotate-22 group-hover:scale-105 pointer-events-none">
                <Image src={img3} alt={category.name || 'Category'} fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain drop-shadow-sm" loading="lazy" />
              </div>
            </>
          ) : hasTwoImages ? (
            <>
              {/* Left Image */}
              <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-10 w-[60%] h-[60%] -rotate-6 transition-all duration-300 ease-out group-hover:-translate-x-2 group-hover:-rotate-15 group-hover:scale-105 pointer-events-none">
                <Image src={img1 || images[0]} alt={category.name || 'Category'} fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain drop-shadow-sm" priority={index < 2} />
              </div>
              {/* Right Image */}
              <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-[60%] h-[60%] rotate-6 transition-all duration-300 ease-out group-hover:translate-x-2 group-hover:rotate-15 group-hover:scale-105 pointer-events-none">
                <Image src={img2 || images[1]} alt={category.name || 'Category'} fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain drop-shadow-sm" loading="lazy" />
              </div>
            </>
          ) : hasOneImage ? (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[84%] h-[84%] transition-all duration-300 ease-out group-hover:-translate-y-[60%] group-hover:scale-110 pointer-events-none">
              <Image
                src={images[0]}
                alt={category.name || category.label || 'Category'}
                fill
                sizes="(max-width: 768px) 20vw, 120px"
                className="object-contain drop-shadow-md"
                priority={index < 2}
              />
            </div>
          ) : (
            renderCategoryFallbackIcon(category.name || category.label, colors.accent)
          )}
        </div>
      </div>

      {/* Category Name Label */}
      <span className="mt-2 mb-1 line-clamp-2 text-[13px] md:text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
        {category.name || category.label}
      </span>
    </Link>
  );
}

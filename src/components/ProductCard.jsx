'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductCardWishlistSlot from "@/components/ProductCardWishlistSlot";
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import { normalizeProductImages } from "@/lib/productImages";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { getProductReviewCount, getProductRating } from "@/lib/productReviewUtils";
import { getProductUnitPrice, getVisibleCompareAtPrice, isProductOutOfStock } from "@/lib/productCommerce";
import { getProductCategoryBgColor } from "@/lib/productCategories";

const formatPrice = (raw) => {
  let cleanNumbers = String(raw).replace(/[^\d.]/g, "");
  if (!cleanNumbers) return "Rs.\u00A00";
  return `Rs.\u00A0${Number(cleanNumbers).toLocaleString("en-PK")}`;
};

export default function ProductCard({ product, className = "", priority = false }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productName = product.Name || product.name || "Fine Jewelry Piece";
  const normalizedImages = normalizeProductImages(product?.Images);
  const hasMultipleImages = normalizedImages.length > 1;

  const sellingPrice = getProductUnitPrice(product);
  const compareAtPrice = getVisibleCompareAtPrice(product, sellingPrice);
  const productSlug = product.slug || product._id || product.id;
  const productHref = `/products/${productSlug}`;
  const isUnavailable = isProductOutOfStock(product);
  const reviewCount = getProductReviewCount(product);
  const rating = getProductRating(product);

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % normalizedImages.length);
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col w-full bg-transparent border-0 shadow-none select-none",
        className
      )}
    >
      {/* Product Image Area with Category Background Color & Soft Premium Rounded Edges */}
      <div 
        className="relative w-full aspect-[4/5] overflow-hidden rounded-[8px] transition-[border-color,box-shadow,background-color] duration-300"
        style={{ backgroundColor: getProductCategoryBgColor(product) }}
      >
        <ProductCardWishlistSlot product={product} />

        {/* Small Previous/Next Chevrons for Cycling Images (Subtle Frosted Glass on Mobile) */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 size-6 sm:size-7 rounded-full bg-white/80 sm:bg-white/90 hover:bg-white text-[#121212] flex items-center justify-center shadow-xs backdrop-blur-[2px] border border-[#E8E5DF] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 cursor-pointer active:scale-90"
            >
              <ChevronLeft className="size-3.5 sm:size-4" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 size-6 sm:size-7 rounded-full bg-white/80 sm:bg-white/90 hover:bg-white text-[#121212] flex items-center justify-center shadow-xs backdrop-blur-[2px] border border-[#E8E5DF] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 cursor-pointer active:scale-90"
            >
              <ChevronRight className="size-3.5 sm:size-4" />
            </button>
          </>
        )}

        {/* Main Product Link & Image */}
        <Link
          href={productHref}
          prefetch={false}
          scroll={true}
          className="relative block size-full active:scale-[0.99] transition-transform duration-200"
          draggable={false}
        >
          {normalizedImages.length > 0 ? (
            normalizedImages.map((img, idx) => {
              const isCurrent = idx === activeImageIndex;
              // Only mount active image and the adjacent images to save bandwidth & memory
              if (!isCurrent && Math.abs(idx - activeImageIndex) > 1 && idx !== 0) return null;
              
              const src = img?.url
                ? optimizeCloudinaryUrl(img.url, CLOUDINARY_IMAGE_PRESETS.productCard)
                : "";
              if (!src) return null;

              return (
                <div
                  key={idx}
                  className={cn(
                    "absolute inset-0 size-full transition-opacity duration-300 ease-out transform-gpu",
                    isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  )}
                  style={{ transform: 'translateZ(0)' }}
                >
                  <Image
                    src={src}
                    alt={`${productName} - view ${idx + 1}`}
                    fill
                    draggable={false}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={priority && idx === 0}
                    loading={priority && idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={cn(
                      "object-cover transition-transform duration-500 ease-out will-change-transform",
                      "md:group-hover:scale-105",
                      isUnavailable && "grayscale-[30%] opacity-75"
                    )}
                    {...getBlurPlaceholderProps(img?.blurDataURL)}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex size-full items-center justify-center bg-[#F4F2EE] text-[#A67C52]">
              <span className="text-xs uppercase tracking-wider font-serif">Ornaments</span>
            </div>
          )}

          {isUnavailable && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 pointer-events-none">
              <span className="bg-[#121212] text-white px-3 py-1 text-[10px] font-sans font-medium uppercase tracking-[0.2em] rounded-[4px]">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* Image Slider Pagination Dots on Image Bottom */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-1 pointer-events-auto">
            {normalizedImages.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
                aria-label={`View image ${idx + 1}`}
                className="p-1 cursor-pointer focus:outline-none"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all duration-300",
                    idx === activeImageIndex
                      ? "size-1.5 bg-[#121212]"
                      : "size-1.5 bg-[#121212]/30 hover:bg-[#121212]/60"
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Area: Title, Star Rating, Price */}
      <div className="pt-2.5 pb-1 text-left flex flex-col items-start px-0.5 w-full">
        <Link
          href={productHref}
          prefetch={false}
          scroll={true}
          className="block w-full"
          draggable={false}
        >
          <h3
            className="text-xs sm:text-[13.5px] font-medium text-[#121212] leading-snug line-clamp-2 min-h-[2.1rem] sm:min-h-[2.35rem] hover:text-[#A67C52] transition-colors"
            title={productName}
          >
            {productName}
          </h3>
        </Link>

        {/* Star Rating — Strictly 1 Line */}
        <div className="mt-1 flex items-center gap-1.5 flex-nowrap whitespace-nowrap overflow-hidden max-w-full">
          <div className="flex text-[#D97706] shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-2.5 sm:size-3",
                  i < Math.round(rating) ? "fill-current" : "text-neutral-300"
                )}
              />
            ))}
          </div>
          <span className="text-[10px] sm:text-[11px] text-[#737373] font-normal whitespace-nowrap shrink-0">
            {rating.toFixed(1)} ({reviewCount})
          </span>
        </div>

        {/* Price Display — Strictly Single Line for Mobile & Desktop */}
        <div className="mt-1.5 flex items-baseline gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap min-w-0 w-full overflow-hidden">
          <p
            className={cn(
              "font-semibold text-[#121212] tabular-nums whitespace-nowrap shrink-0",
              sellingPrice >= 100000
                ? "text-[11.5px] min-[360px]:text-[12.5px] sm:text-[13.5px] md:text-sm"
                : "text-xs min-[360px]:text-[13px] sm:text-sm"
            )}
          >
            {formatPrice(sellingPrice)}
          </p>
          {compareAtPrice ? (
            <p
              className={cn(
                "font-normal text-neutral-400 line-through tabular-nums whitespace-nowrap shrink-0",
                compareAtPrice >= 100000
                  ? "text-[9.5px] min-[360px]:text-[10.5px] sm:text-[11.5px]"
                  : "text-[10px] min-[360px]:text-[11px] sm:text-xs"
              )}
            >
              {formatPrice(compareAtPrice)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

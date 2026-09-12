'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { normalizeProductImage } from '@/lib/productImages';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { getProductTagById } from '@/lib/productTags';
import { getProductCategoryBgColor } from '@/lib/productCategories';
import { cn } from '@/lib/utils';
import ProductWishlistButton from '@/components/ProductWishlistButton';

export default function ProductGallery({ images, primaryTag, product }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainApi, setMainApi] = useState(null);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [lensState, setLensState] = useState({
    show: false,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    containerWidth: 0,
    containerHeight: 0,
    isTouch: false,
  });

  const containerRef = useRef(null);

  const normalizedImages = useMemo(
    () => (Array.isArray(images) ? images.map(normalizeProductImage).filter(Boolean) : []),
    [images]
  );
  const hasMultipleImages = normalizedImages.length > 1;
  const currentImage = normalizedImages[selectedIndex] || normalizedImages[0];
  const zoomLevel = 2.85;

  const mainOptions = useMemo(
    () => ({
      active: hasMultipleImages,
      align: 'start',
      focus: false,
      loop: hasMultipleImages,
      slidesToScroll: 1,
      watchDrag: !isMagnifierActive,
    }),
    [hasMultipleImages, isMagnifierActive]
  );

  const mainSsr = useMemo(
    () =>
      hasMultipleImages
        ? {
            slideSizes: Array.from({ length: normalizedImages.length }, () => 100),
          }
        : undefined,
    [hasMultipleImages, normalizedImages.length]
  );

  // Sync carousel slide state with selectedIndex
  useEffect(() => {
    if (!mainApi) return;

    const syncSelection = () => {
      const nextIndex = typeof mainApi.selectedScrollSnap === 'function'
        ? mainApi.selectedScrollSnap()
        : typeof mainApi.selectedSnap === 'function'
        ? mainApi.selectedSnap()
        : 0;
      setSelectedIndex(nextIndex);
    };

    syncSelection();
    mainApi.on('select', syncSelection);
    mainApi.on('reinit', syncSelection);
    mainApi.on('settle', syncSelection);

    return () => {
      mainApi.off('select', syncSelection);
      mainApi.off('reinit', syncSelection);
      mainApi.off('settle', syncSelection);
    };
  }, [mainApi]);

  // Lock or unlock carousel dragging when magnifier is toggled
  useEffect(() => {
    if (mainApi && typeof mainApi.reInit === 'function') {
      mainApi.reInit({ watchDrag: !isMagnifierActive });
    }
  }, [isMagnifierActive, mainApi]);

  const handlePointerMove = useCallback((clientX, clientY, isTouch = false) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const targetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const targetY = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const isMobileSize = rect.width < 600;
    const currentDiameter = isMobileSize ? 180 : 260;
    const radius = currentDiameter / 2;
    const padding = 6;

    let x = targetX;
    let y = targetY;

    if (isTouch) {
      const offset = 95;
      // If finger is in the top area where loupe would clip off the top edge:
      if (targetY - offset - radius < padding) {
        // Auto-flip loupe to BELOW the finger so it remains 100% visible and unclipt
        y = targetY + offset;
      } else {
        // Default: position loupe ABOVE the finger
        y = targetY - offset;
      }
    }

    // Clamp coordinates so the loupe circle stays comfortably inside the image box
    const clampedX = Math.max(radius + padding, Math.min(rect.width - radius - padding, x));
    const clampedY = Math.max(radius + padding, Math.min(rect.height - radius - padding, y));

    setLensState({
      show: true,
      x: clampedX,
      y: clampedY,
      targetX,
      targetY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      isTouch,
    });
  }, []);

  const handleMouseMove = (e) => {
    if (!isMagnifierActive) return;
    handlePointerMove(e.clientX, e.clientY, false);
  };

  const handleMouseLeave = () => {
    setLensState((prev) => ({ ...prev, show: false }));
  };

  const handleTouchStart = (e) => {
    if (!isMagnifierActive) return;
    if (e.touches && e.touches[0]) {
      e.preventDefault?.();
      e.stopPropagation?.();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isMagnifierActive) return;
    if (e.touches && e.touches[0]) {
      e.preventDefault?.();
      e.stopPropagation?.();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, true);
    }
  };

  const handleTouchEnd = () => {
    setLensState((prev) => ({ ...prev, show: false }));
  };

  const handleThumbnailClick = (index) => {
    setSelectedIndex(index);
    if (mainApi) {
      if (typeof mainApi.scrollTo === 'function') {
        mainApi.scrollTo(index);
      } else if (typeof mainApi.goTo === 'function') {
        mainApi.goTo(index);
      }
    }
  };

  if (normalizedImages.length === 0) {
    return (
      <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#FAF9F6] border border-[#E8E5DF] text-neutral-400 rounded-xl sm:rounded-2xl">
        <ImageIcon className="size-16 stroke-[1]" />
      </div>
    );
  }

  const mainTag = primaryTag ? getProductTagById(primaryTag) : null;
  const zoomImageUrl = currentImage?.url
    ? optimizeCloudinaryUrl(currentImage.url, CLOUDINARY_IMAGE_PRESETS.productGalleryZoom)
    : '';

  // Refined lens size: 260px on PC, 180px on Mobile for a comfortable, balanced jewelry loupe view
  const isMobileSize = lensState.containerWidth > 0 && lensState.containerWidth < 600;
  const lensDiameter = isMobileSize ? 180 : 260;
  const lensRadius = lensDiameter / 2;

  return (
    <div className="flex w-full flex-col gap-3 sm:gap-4 select-none">
      {/* Main Large Image Container with Smooth Rounded Borders */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E8E5DF] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors duration-300",
          isMagnifierActive && "cursor-crosshair touch-none"
        )}
        style={{ backgroundColor: getProductCategoryBgColor(product) }}
      >
        {/* Transparent Touch / Interaction Shield when Magnifier is Active */}
        {isMagnifierActive && (
          <div
            className="absolute inset-0 z-20 touch-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {/* Product Tag Badge */}
        {mainTag && (
          <div 
            className="absolute left-3 top-3 sm:left-4 sm:top-4 z-25 pointer-events-auto flex items-center gap-1.5 px-3 py-1 text-[9.5px] sm:text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-white bg-[#121212]/95 backdrop-blur-sm rounded-md shadow-xs"
            title={mainTag.label}
          >
            {mainTag.label}
          </div>
        )}

        {/* Mobile Wishlist Button (Pure Icon) */}
        {product && (
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-25 pointer-events-auto md:hidden">
            <ProductWishlistButton
              product={product}
              mode="icon-only"
              className="size-9"
            />
          </div>
        )}

        {/* Jewelry Loupe Magnifier Toggle Button (Pure Icon) */}
        <div 
          className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 z-40 pointer-events-auto flex items-center gap-2"
          onMouseEnter={() => setLensState((prev) => ({ ...prev, show: false }))}
          onTouchStart={() => setLensState((prev) => ({ ...prev, show: false }))}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMagnifierActive(!isMagnifierActive);
              setLensState((prev) => ({ ...prev, show: false }));
            }}
            onMouseEnter={() => setLensState((prev) => ({ ...prev, show: false }))}
            onTouchStart={() => setLensState((prev) => ({ ...prev, show: false }))}
            aria-pressed={isMagnifierActive}
            title={isMagnifierActive ? "Turn off magnifier" : "Magnify jewelry details"}
            className={cn(
              "inline-flex items-center justify-center size-9 bg-transparent border-0 shadow-none text-[#121212] hover:text-[#A67C52] transition-transform duration-200 cursor-pointer active:scale-90 select-none p-0",
              isMagnifierActive && "text-[#A67C52] scale-110"
            )}
          >
            {isMagnifierActive ? (
              <ZoomOut className="size-6 text-[#A67C52] stroke-[1.8] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" />
            ) : (
              <ZoomIn className="size-6 text-[#121212] hover:text-[#A67C52] stroke-[1.8] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]" />
            )}
          </button>
        </div>

        {/* Loupe Active Helper Banner */}
        {isMagnifierActive && !lensState.show && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-25 pointer-events-none bg-[#121212]/90 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-sans px-3.5 py-1.5 rounded-full shadow-lg border border-[#A67C52]/40 flex items-center gap-1.5 animate-pulse">
            <Sparkles className="size-3 text-[#A67C52]" />
            <span>Hover or drag over jewelry</span>
          </div>
        )}

        {/* Standard Carousel */}
        <Carousel
          setApi={setMainApi}
          opts={mainOptions}
          ssr={mainSsr}
          className="h-full rounded-2xl sm:rounded-3xl overflow-hidden"
        >
          <CarouselContent viewportClassName="h-full rounded-2xl sm:rounded-3xl" className="ml-0 h-full">
            {normalizedImages.map((image, index) => {
              const productName = product?.Name || product?.name || 'Product';
              return (
                <CarouselItem key={index} className="h-full basis-full pl-0">
                  <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-3xl">
                    <Image
                      src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
                      alt={`${productName} - View ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 50vw"
                      className="object-cover rounded-2xl sm:rounded-3xl"
                      {...getBlurPlaceholderProps(image.blurDataURL)}
                      priority={index === 0}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* Touch target indicator ring on mobile */}
        {isMagnifierActive && lensState.show && lensState.isTouch && (
          <div
            className="pointer-events-none absolute z-25 rounded-full size-8 border-2 border-[#A67C52] bg-[#A67C52]/20 -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{
              left: `${lensState.targetX}px`,
              top: `${lensState.targetY}px`,
            }}
          />
        )}

        {/* Circular Jeweler's Loupe Lens */}
        {isMagnifierActive && lensState.show && zoomImageUrl && (
          <div
            className="pointer-events-none absolute z-30 rounded-full border-[3px] border-[#121212] ring-4 ring-white/95 shadow-[0_20px_48px_rgba(0,0,0,0.5)] bg-no-repeat overflow-hidden transition-opacity duration-150 animate-in fade-in-0 zoom-in-95"
            style={{
              width: `${lensDiameter}px`,
              height: `${lensDiameter}px`,
              left: `${lensState.x - lensRadius}px`,
              top: `${lensState.y - lensRadius}px`,
              backgroundImage: `url(${zoomImageUrl})`,
              backgroundSize: `${lensState.containerWidth * zoomLevel}px ${lensState.containerHeight * zoomLevel}px`,
              backgroundPosition: `${-lensState.targetX * zoomLevel + lensRadius}px ${-lensState.targetY * zoomLevel + lensRadius}px`,
            }}
          >
            {/* High-end Jeweler reflection and center focus crosshair */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/10 via-transparent to-white/25 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#A67C52]/70 border border-white shadow-xs pointer-events-none" />
          </div>
        )}

        {/* Mobile Swipe Indicators */}
        {hasMultipleImages && !isMagnifierActive && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 md:hidden z-10 pointer-events-none">
            {normalizedImages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-pressed={index === selectedIndex}
                className="pointer-events-auto cursor-pointer p-1"
              >
                <span
                  className={cn(
                    'transition-all duration-300 pointer-events-none block rounded-full',
                    index === selectedIndex
                      ? 'w-5 h-1 bg-[#121212]'
                      : 'w-1.5 h-1 bg-black/25'
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Thumbnail Strip with Matching Rounded Corners */}
      {hasMultipleImages ? (
        <div className="hidden md:grid grid-cols-5 gap-3 w-full">
          {normalizedImages.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleThumbnailClick(index)}
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={index === selectedIndex}
              className={`relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-lg sm:rounded-xl border transition-all duration-300 ${
                index === selectedIndex
                  ? 'border-[#121212] opacity-100 ring-2 ring-[#121212]'
                  : 'border-[#E8E5DF] opacity-70 hover:opacity-100 hover:border-[#121212]/50'
              }`}
              style={{ backgroundColor: getProductCategoryBgColor(product) }}
            >
              <Image
                src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryThumb)}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover rounded-lg sm:rounded-xl"
                {...getBlurPlaceholderProps(image.blurDataURL)}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

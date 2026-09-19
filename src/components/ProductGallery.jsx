'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { 
  ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(false);

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
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lightboxTouchStartRef = useRef(0);

  const normalizedImages = useMemo(
    () => (Array.isArray(images) ? images.map(normalizeProductImage).filter(Boolean) : []),
    [images]
  );
  const hasMultipleImages = normalizedImages.length > 1;
  const currentImage = normalizedImages[selectedIndex] || normalizedImages[0];
  const productName = product?.Name || product?.name || 'Product';
  const zoomLevel = 1.85;

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

  // Keyboard navigation & body scroll lock for fullscreen lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setLightboxZoom(false);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : normalizedImages.length - 1));
        setLightboxZoom(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev < normalizedImages.length - 1 ? prev + 1 : 0));
        setLightboxZoom(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, normalizedImages.length]);

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
        y = targetY + offset;
      } else {
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

  const openLightbox = (index = selectedIndex) => {
    setLightboxIndex(index);
    setLightboxZoom(false);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxZoom(false);
  };

  const handleLightboxNavigate = (index) => {
    setLightboxIndex(index);
    setLightboxZoom(false);
    handleThumbnailClick(index);
  };

  const handleImagePointerDown = (e) => {
    pointerStartRef.current = {
      x: e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0),
      y: e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0),
      time: Date.now(),
    };
  };

  const handleImagePointerUp = (e) => {
    if (isMagnifierActive) return;
    const clientX = e.clientX ?? (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
    const clientY = e.clientY ?? (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);
    const dx = Math.abs(clientX - pointerStartRef.current.x);
    const dy = Math.abs(clientY - pointerStartRef.current.y);
    const dt = Date.now() - pointerStartRef.current.time;

    // Only open lightbox if it was a genuine click/tap and not a swipe drag
    if (dx < 8 && dy < 8 && dt < 450) {
      openLightbox(selectedIndex);
    }
  };

  const handleLightboxTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      lightboxTouchStartRef.current = e.touches[0].clientX;
    }
  };

  const handleLightboxTouchEnd = (e) => {
    if (!e.changedTouches || !e.changedTouches[0] || lightboxZoom) return;
    const diff = e.changedTouches[0].clientX - lightboxTouchStartRef.current;
    if (diff > 50) {
      handleLightboxNavigate(lightboxIndex > 0 ? lightboxIndex - 1 : normalizedImages.length - 1);
    } else if (diff < -50) {
      handleLightboxNavigate(lightboxIndex < normalizedImages.length - 1 ? lightboxIndex + 1 : 0);
    }
  };

  if (normalizedImages.length === 0) {
    return (
      <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#FAF9F6] border border-[#E8E5DF] text-neutral-400 rounded-sm">
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
      {/* Preload the high-res zoom image to prevent delay on first hover */}
      {zoomImageUrl && (
        <div className="hidden" aria-hidden="true">
          <img src={zoomImageUrl} alt="" loading="eager" fetchpriority="low" />
        </div>
      )}
      {/* Main Large Image Container with Smooth Rounded Borders */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-[#E8E5DF] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-colors duration-300 group/gallery",
          isMagnifierActive ? "cursor-crosshair touch-none" : "cursor-zoom-in"
        )}
        style={{ backgroundColor: getProductCategoryBgColor(product) }}
      >
        {/* Transparent Touch / Interaction Shield when Magnifier is Active */}
        {isMagnifierActive && (
          <div
            className="absolute inset-0 z-20 touch-none cursor-crosshair md:hidden"
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

        {/* Gallery Controls (Fullscreen Lightbox & Jeweler Loupe) */}
        <div 
          className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 z-40 pointer-events-auto flex items-center gap-2"
          onMouseEnter={() => setLensState((prev) => ({ ...prev, show: false }))}
          onTouchStart={() => setLensState((prev) => ({ ...prev, show: false }))}
        >
          {/* Fullscreen Modal Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(selectedIndex);
            }}
            aria-label="View fullscreen image"
            title="Open fullscreen view"
            className="inline-flex items-center justify-center size-9 sm:size-10 rounded-full bg-white/90 backdrop-blur-md border border-[#E8E5DF] shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-[#121212] hover:text-[#A67C52] hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none"
          >
            <Maximize2 className="size-4 sm:size-4.5 stroke-[2]" />
          </button>

          {/* Jewelry Loupe Magnifier Toggle Button (Luxury Frosted Glass Pill) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMagnifierActive((prev) => !prev);
              setLensState((prev) => ({ ...prev, show: false }));
            }}
            onMouseEnter={() => setLensState((prev) => ({ ...prev, show: false }))}
            onTouchStart={() => setLensState((prev) => ({ ...prev, show: false }))}
            aria-pressed={isMagnifierActive}
            title={isMagnifierActive ? "Turn off magnifier" : "Inspect jewelry details"}
            className={cn(
              "inline-flex items-center justify-center size-9 sm:size-10 rounded-full bg-white/90 backdrop-blur-md border border-[#E8E5DF] shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-[#121212] hover:text-[#A67C52] hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none",
              isMagnifierActive && "bg-[#121212] text-white hover:bg-[#121212] hover:text-white border-[#121212]"
            )}
          >
            {isMagnifierActive ? (
              <ZoomOut className="size-4.5 sm:size-5 stroke-[2]" />
            ) : (
              <ZoomIn className="size-4.5 sm:size-5 stroke-[2]" />
            )}
          </button>
        </div>

        {/* Loupe Active Helper Banner (Mobile) */}
        {isMagnifierActive && !lensState.show && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-25 pointer-events-none bg-[#121212]/90 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-sans px-3.5 py-1.5 rounded-full shadow-lg border border-[#A67C52]/40 flex items-center gap-1.5 animate-pulse md:hidden">
            <Sparkles className="size-3 text-[#A67C52]" />
            <span>Drag finger to inspect details</span>
          </div>
        )}

        {/* Standard Carousel */}
        <Carousel
          setApi={setMainApi}
          opts={mainOptions}
          ssr={mainSsr}
          className="h-full rounded-sm overflow-hidden"
        >
          <CarouselContent viewportClassName="h-full rounded-sm" className="ml-0 h-full">
            {normalizedImages.map((image, index) => {
              const isFirstImage = index === 0;
              return (
                <CarouselItem key={index} className="h-full basis-full pl-0">
                  <div 
                    onPointerDown={handleImagePointerDown}
                    onPointerUp={handleImagePointerUp}
                    className="relative h-full min-h-0 w-full overflow-hidden rounded-sm p-0 cursor-zoom-in"
                  >
                    <Image
                      src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
                      alt={`${productName} - View ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 50vw"
                      className="object-cover object-center transition-transform duration-500"
                      {...getBlurPlaceholderProps(image.blurDataURL)}
                      priority={isFirstImage}
                      fetchPriority={isFirstImage ? 'high' : 'auto'}
                      loading={isFirstImage ? 'eager' : 'lazy'}
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
            className="pointer-events-none absolute z-30 rounded-full border-[3px] border-[#A67C52] ring-4 ring-white/95 shadow-[0_20px_48px_rgba(0,0,0,0.5)] bg-no-repeat overflow-hidden transition-opacity duration-150 animate-in fade-in-0 zoom-in-95"
            style={{
              width: `${lensDiameter}px`,
              height: `${lensDiameter}px`,
              left: `${lensState.x - lensRadius}px`,
              top: `${lensState.y - lensRadius}px`,
              backgroundColor: getProductCategoryBgColor(product) || '#FAF9F6',
              backgroundImage: `url(${zoomImageUrl})`,
              backgroundSize: `${lensState.containerWidth * zoomLevel}px ${lensState.containerHeight * zoomLevel}px`,
              backgroundPosition: `${-lensState.targetX * zoomLevel + lensRadius}px ${-lensState.targetY * zoomLevel + lensRadius}px`,
            }}
          >
            {/* High-end Jeweler reflection and center focus crosshair */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/5 via-transparent to-white/20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#A67C52]/80 border border-white shadow-xs pointer-events-none" />
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
              className={`relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-sm border transition-all duration-300 ${
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
                className="object-cover rounded-sm"
                {...getBlurPlaceholderProps(image.blurDataURL)}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* Luxury Fullscreen Lightbox Modal */}
      {typeof document !== 'undefined' && isLightboxOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-[#0A0A0A]/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in-0 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen Product Gallery"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 z-50 text-white border-b border-white/10 bg-black/75 backdrop-blur-md gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="font-serif text-xs sm:text-base font-normal tracking-wide text-neutral-200 truncate">
                {productName}
              </span>
              {hasMultipleImages && (
                <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 font-sans text-[11px] sm:text-xs font-medium">
                  {lightboxIndex + 1} / {normalizedImages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Zoom In/Out Toggle within Lightbox */}
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => !prev)}
                title={lightboxZoom ? "Reset zoom (1x)" : "Zoom in (2x)"}
                className={cn(
                  "p-2 sm:p-2.5 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer",
                  lightboxZoom && "bg-white text-black border-white hover:bg-white hover:text-black"
                )}
              >
                {lightboxZoom ? <ZoomOut className="size-4 sm:size-4.5" /> : <ZoomIn className="size-4 sm:size-4.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                title="Close fullscreen view (Esc)"
                className="p-2 sm:p-2.5 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
              >
                <X className="size-4.5 sm:size-5" />
              </button>
            </div>
          </div>

          {/* Center Image Stage */}
          <div 
            className="relative flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0 overflow-hidden"
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {/* Previous Button */}
            {hasMultipleImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLightboxNavigate(lightboxIndex > 0 ? lightboxIndex - 1 : normalizedImages.length - 1);
                }}
                title="Previous image"
                className="absolute left-3 sm:left-8 z-40 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="size-5 sm:size-6 stroke-[2]" />
              </button>
            )}

            {/* Current Large Image */}
            <div 
              onClick={() => setLightboxZoom((prev) => !prev)}
              className={cn(
                "relative size-full max-h-[82vh] flex items-center justify-center transition-transform duration-300 select-none",
                lightboxZoom ? "cursor-zoom-out overflow-auto" : "cursor-zoom-in"
              )}
            >
              <div 
                className={cn(
                  "relative w-full h-full max-w-5xl transition-transform duration-300 flex items-center justify-center",
                  lightboxZoom && "scale-140 sm:scale-165"
                )}
              >
                <Image
                  src={optimizeCloudinaryUrl(
                    normalizedImages[lightboxIndex]?.url,
                    CLOUDINARY_IMAGE_PRESETS.productGalleryZoom
                  )}
                  alt={`${productName} view ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>

            {/* Next Button */}
            {hasMultipleImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLightboxNavigate(lightboxIndex < normalizedImages.length - 1 ? lightboxIndex + 1 : 0);
                }}
                title="Next image"
                className="absolute right-3 sm:right-8 z-40 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="size-5 sm:size-6 stroke-[2]" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {hasMultipleImages && (
            <div className="px-4 py-3.5 z-50 border-t border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center gap-2.5 sm:gap-3 overflow-x-auto">
              {normalizedImages.map((image, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLightboxNavigate(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={cn(
                    "relative size-12 sm:size-14 rounded-sm overflow-hidden border transition-all cursor-pointer shrink-0",
                    idx === lightboxIndex 
                      ? "border-white ring-2 ring-white scale-105 opacity-100" 
                      : "border-white/20 opacity-50 hover:opacity-90"
                  )}
                >
                  <Image
                    src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryThumb)}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="60px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

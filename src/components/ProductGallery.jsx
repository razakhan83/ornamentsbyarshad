'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { normalizeProductImage } from '@/lib/productImages';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { getProductTagById } from '@/lib/productTags';
import { cn } from '@/lib/utils';
import ProductWishlistButton from '@/components/ProductWishlistButton';

export default function ProductGallery({ images, primaryTag, product }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mainApi, setMainApi] = useState();
  const [thumbsApi, setThumbsApi] = useState();
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [lensState, setLensState] = useState({
    show: false,
    x: 0,
    y: 0,
    containerWidth: 0,
    containerHeight: 0,
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
      active: hasMultipleImages && !isMagnifierActive,
      align: 'start',
      focus: false,
      loop: hasMultipleImages,
      slideChanges: false,
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

  useEffect(() => {
    if (!mainApi) {
      return;
    }

    const syncSelection = () => {
      const nextIndex = mainApi.selectedSnap();
      setSelectedIndex(nextIndex);
      thumbsApi?.goTo(nextIndex);
    };

    syncSelection();
    mainApi.on('select', syncSelection);
    mainApi.on('reinit', syncSelection);

    return () => {
      mainApi.off('select', syncSelection);
      mainApi.off('reinit', syncSelection);
    };
  }, [mainApi, thumbsApi]);

  const handlePointerMove = useCallback((clientX, clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    setLensState({
      show: true,
      x,
      y,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
  }, []);

  const handleMouseMove = (e) => {
    if (!isMagnifierActive) return;
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    setLensState((prev) => ({ ...prev, show: false }));
  };

  const handleTouchMove = (e) => {
    if (!isMagnifierActive || !e.touches[0]) return;
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setLensState((prev) => ({ ...prev, show: false }));
  };

  if (normalizedImages.length === 0) {
    return (
      <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#FAF9F6] border border-[#E8E5DF] text-neutral-400">
        <ImageIcon className="size-16 stroke-[1]" />
      </div>
    );
  }

  const handleThumbnailClick = (index) => {
    mainApi?.goTo(index);
  };

  const mainTag = primaryTag ? getProductTagById(primaryTag) : null;
  const currentImageUrl = currentImage?.url
    ? optimizeCloudinaryUrl(currentImage.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)
    : '';

  // Dynamic lens size: 220px on PC, 190px on Mobile
  const lensDiameter = lensState.containerWidth > 0 && lensState.containerWidth < 500 ? 190 : 225;
  const lensRadius = lensDiameter / 2;

  return (
    <div className="flex w-full flex-col gap-3 sm:gap-4 select-none">
      {/* Main Large Image Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative aspect-[4/5] w-full overflow-hidden rounded-none bg-[#F4F2EE] border border-[#E8E5DF]",
          isMagnifierActive && "cursor-crosshair touch-none"
        )}
      >
        {/* Product Tag Badge */}
        {mainTag && (
          <div 
            className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 text-[9.5px] sm:text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-white bg-[#121212] rounded-none shadow-xs"
            title={mainTag.label}
          >
            {mainTag.label}
          </div>
        )}

        {/* Mobile Wishlist Button */}
        {product && (
          <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-20 pointer-events-auto md:hidden">
            <ProductWishlistButton
              product={product}
              mode="detail"
              className="!bg-white/90 backdrop-blur-sm !border-[#E8E5DF] text-[#121212] hover:text-[#A67C52] [&>span]:hidden flex items-center justify-center size-8 p-0 rounded-none shadow-sm"
            />
          </div>
        )}

        {/* Jewelry Loupe Magnifier Toggle Button */}
        <div 
          className="absolute right-2.5 bottom-2.5 sm:right-3 sm:bottom-3 z-40 pointer-events-auto flex items-center gap-2"
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
              "inline-flex items-center justify-center gap-1.5 size-8 sm:size-auto sm:px-3 sm:py-1.5 rounded-none text-[10.5px] font-sans font-semibold tracking-wider uppercase transition-all duration-300 shadow-md cursor-pointer active:scale-95",
              isMagnifierActive
                ? "bg-[#121212] text-white ring-1 ring-[#A67C52] shadow-lg"
                : "bg-white/95 text-[#121212] border border-[#E8E5DF] hover:bg-[#121212] hover:text-white"
            )}
          >
            {isMagnifierActive ? (
              <>
                <ZoomOut className="size-3.5 sm:size-4 text-[#A67C52]" />
                <span className="hidden sm:inline">Active</span>
              </>
            ) : (
              <>
                <ZoomIn className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Zoom</span>
              </>
            )}
          </button>
        </div>

        {/* Loupe Active Helper Banner */}
        {isMagnifierActive && !lensState.show && (
          <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-[#121212]/90 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-sans px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-lg border border-[#A67C52]/40 flex items-center gap-1.5 animate-pulse">
            <Sparkles className="size-3 text-[#A67C52]" />
            <span>Hover or drag over jewelry</span>
          </div>
        )}

        {/* Standard Carousel */}
        <Carousel
          setApi={setMainApi}
          opts={mainOptions}
          ssr={mainSsr}
          className="h-full"
        >
          <CarouselContent viewportClassName="h-full" className="ml-0 h-full">
            {normalizedImages.map((image, index) => {
              const productName = product?.Name || product?.name || 'Product';
              return (
                <CarouselItem key={index} className="h-full basis-full pl-0">
                  <div className="relative h-full min-h-0 w-full overflow-hidden">
                    <Image
                      src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
                      alt={`${productName} - View ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 50vw"
                      className="object-cover"
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

        {/* Circular Jeweler's Loupe Lens */}
        {isMagnifierActive && lensState.show && currentImageUrl && (
          <div
            className="pointer-events-none absolute z-30 rounded-full border-[2.5px] border-[#121212] ring-4 ring-white/90 shadow-[0_16px_36px_rgba(0,0,0,0.45)] bg-no-repeat overflow-hidden transition-opacity duration-150 animate-in fade-in-0 zoom-in-90"
            style={{
              width: `${lensDiameter}px`,
              height: `${lensDiameter}px`,
              left: `${lensState.x - lensRadius}px`,
              top: `${lensState.y - lensRadius}px`,
              backgroundImage: `url(${currentImageUrl})`,
              backgroundSize: `${lensState.containerWidth * zoomLevel}px ${lensState.containerHeight * zoomLevel}px`,
              backgroundPosition: `${-lensState.x * zoomLevel + lensRadius}px ${-lensState.y * zoomLevel + lensRadius}px`,
            }}
          >
            {/* Center crosshair / lens reflection styling */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/5 via-transparent to-white/20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[#A67C52]/60 border border-white pointer-events-none" />
          </div>
        )}

        {/* Mobile Swipe Indicators */}
        {hasMultipleImages && !isMagnifierActive && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center items-center gap-1.5 md:hidden z-10 pointer-events-none">
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
                    'transition-all duration-300 pointer-events-none block',
                    index === selectedIndex
                      ? 'w-5 h-1 bg-[#121212]'
                      : 'w-1.5 h-1 bg-black/20'
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Thumbnail Strip */}
      {hasMultipleImages ? (
        <div className="hidden md:grid grid-cols-5 gap-3 w-full">
          {normalizedImages.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleThumbnailClick(index)}
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={index === selectedIndex}
              className={`relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-none bg-[#F4F2EE] border transition-all duration-300 ${
                index === selectedIndex
                  ? 'border-[#121212] opacity-100 ring-1 ring-[#121212]'
                  : 'border-[#E8E5DF] opacity-70 hover:opacity-100 hover:border-[#121212]/40'
              }`}
            >
              <Image
                src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryThumb)}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover rounded-none"
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



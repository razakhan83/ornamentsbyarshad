'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
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
  const normalizedImages = useMemo(
    () => (Array.isArray(images) ? images.map(normalizeProductImage).filter(Boolean) : []),
    [images]
  );
  const hasMultipleImages = normalizedImages.length > 1;
  const mainOptions = useMemo(
    () => ({
      active: hasMultipleImages,
      align: 'start',
      focus: false,
      loop: hasMultipleImages,
      slideChanges: false,
      slidesToScroll: 1,
    }),
    [hasMultipleImages]
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
  const thumbsOptions = useMemo(
    () => ({
      active: hasMultipleImages,
      align: 'start',
      containScroll: 'trimSnaps',
      dragFree: true,
      slideChanges: false,
      slidesToScroll: 1,
    }),
    [hasMultipleImages]
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

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Main Large Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#F4F2EE]">
        {mainTag && (
          <div 
            className={cn("absolute left-3 top-3 z-20 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans uppercase tracking-[0.16em] font-semibold text-white bg-[#121212] rounded-md")}
            title={mainTag.label}
          >
            {mainTag.label}
          </div>
        )}

        {product && (
          <div className="absolute right-3 top-3 z-20 pointer-events-auto md:hidden">
            <ProductWishlistButton
              product={product}
              mode="detail"
              className="!bg-white/80 backdrop-blur-sm !border-[#E8E5DF] text-[#121212] hover:text-[#A67C52] [&>span]:hidden flex items-center justify-center size-9 p-0 rounded-full shadow-sm"
            />
          </div>
        )}

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
                  <div className="relative h-full min-h-0 w-full overflow-hidden group cursor-crosshair">
                    <Image
                      src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
                      alt={`${productName} - View ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out hover:scale-125"
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

        {/* Mobile Swipe Indicators */}
        {hasMultipleImages && (
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
                    'transition-all duration-300 pointer-events-none block',
                    index === selectedIndex
                      ? 'w-6 h-1 bg-[#121212]'
                      : 'w-2 h-1 bg-black/20'
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
              className={`relative aspect-square w-full cursor-pointer overflow-hidden bg-[#F4F2EE] border transition-all duration-300 ${
                index === selectedIndex
                  ? 'border-[#121212] opacity-100 ring-1 ring-[#121212]'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryThumb)}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover p-1"
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


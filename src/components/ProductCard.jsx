import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductCardAddToCartButton from "@/components/ProductCardAddToCartButton";
import ProductCardWishlistSlot from "@/components/ProductCardWishlistSlot";
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import { normalizeProductImages } from "@/lib/productImages";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { getProductTagById } from "@/lib/productTags";

const formatPrice = (raw) => {
  let cleanNumbers = String(raw).replace(/[^\d.]/g, "");
  if (!cleanNumbers) return "Rs. 0";
  return `Rs. ${Number(cleanNumbers).toLocaleString("en-PK")}`;
};

function getSellingPrice(product) {
  const productPrice = Number(product.Price || product.price || 0);

  if (product.isDiscounted && product.discountPercentage > 0) {
    return product.discountedPrice != null
      ? Number(product.discountedPrice)
      : Math.round(productPrice * (1 - product.discountPercentage / 100));
  }

  return productPrice;
}

function getVisibleCompareAtPrice(product, sellingPrice) {
  const compareAtPrice = Number(product.compareAtPrice ?? 0);
  return compareAtPrice > sellingPrice ? compareAtPrice : null;
}

function getDiscountBadge(product) {
  if (product.isDiscounted && product.discountPercentage > 0) {
    return `${product.discountPercentage}% OFF`;
  }
  return null;
}

function getFeatureBadge(product) {
  if (product.isBestSelling) {
    return {
      label: "Best Seller",
      className:
        "pointer-events-auto rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground uppercase tracking-[0.08em]",
    };
  }

  return null;
}

import { getProductCategories } from "@/lib/productCategories";
import { getCategoryColor } from "@/lib/categoryColors";

export default function ProductCard({ product, className = "", imageBg, isPreviewMode = false, priority = false }) {
  const categories = getProductCategories(product);
  const primaryCategory = categories[0];
  const primaryCategoryName = primaryCategory?.name || primaryCategory?.label || "";
  const resolvedBg = imageBg || '#f4f4f5';

  const productName = product.Name || product.name || "Unknown";
  const normalizedImages = normalizeProductImages(product?.Images);
  const primaryImage = normalizedImages[0] || null;
  const secondaryImage = normalizedImages[1] || null;

  const primaryImageSrc = primaryImage?.url
    ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.productCard)
    : "";
  const secondaryImageSrc = secondaryImage?.url
    ? optimizeCloudinaryUrl(secondaryImage.url, CLOUDINARY_IMAGE_PRESETS.productCard)
    : "";
  const productPrice = product.Price || product.price || 0;
  const sellingPrice = getSellingPrice(product);
  const compareAtPrice = getVisibleCompareAtPrice(product, sellingPrice);
  const productSlug = product.slug || product._id || product.id;
  const productHref = `/products/${productSlug}`;

  const discountLabel = getDiscountBadge(product);
  const featureBadge = getFeatureBadge(product);
  const reviewCount = Number(product.reviewCount || 0);
  const averageRating = Number(product.averageRating || 0);
  const ratingLabel = reviewCount > 0 && averageRating > 0 ? averageRating.toFixed(1) : "";
  const isUnavailable = product.StockStatus === "Out of Stock" || product.showOnStore === false;
  
  const primaryTag = product.primaryTag ? getProductTagById(product.primaryTag) : null;

  return (
    <Card
      className={cn(
        "@container product-card-surface group relative flex flex-col h-full gap-0 overflow-hidden rounded-xl border-none ring-0 bg-card shadow-none [@media(hover:hover)]:hover:-translate-y-0.5 transition-transform duration-150 ease-out",
        "py-0",
        className
      )}
      draggable={false}
    >
      <div className="relative">
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5">
          {ratingLabel ? (
            <Badge
              className={cn(
                "pointer-events-auto rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-amber-700 tabular-nums"
              )}
            >
              <Star className="mr-1 size-3.5 fill-current" />
              {ratingLabel}
            </Badge>
          ) : null}

          {primaryTag && (
            <div 
              className={cn("pointer-events-auto flex items-center justify-center rounded-full p-1.5 shadow-sm backdrop-blur-md border border-white/20", primaryTag.bgColor, primaryTag.color)}
              title={primaryTag.label}
            >
              <primaryTag.icon className="size-4 drop-shadow-sm" />
            </div>
          )}

          {featureBadge && (
            <Badge className={cn(featureBadge.className)}>
              {featureBadge.label}
            </Badge>
          )}

          {discountLabel && (
            <Badge
              className={cn(
                "pointer-events-auto rounded border-none bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground tracking-wide shadow-sm"
              )}
            >
              {discountLabel}
            </Badge>
          )}

          {product.isFreeDelivery && primaryTag?.id !== 'free-shipping' && (
            <Badge
              className={cn(
                "pointer-events-auto rounded border-none bg-emerald-600 dark:bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide shadow-sm flex items-center gap-1"
              )}
            >
              <Truck className="size-3" />
              Free Delivery
            </Badge>
          )}


        </div>

        <ProductCardWishlistSlot product={product} />

        <Link
          href={productHref}
          prefetch={false}
          scroll={true}
          className="relative block aspect-square w-full overflow-hidden rounded-t-[11px]"
          style={{ backgroundColor: resolvedBg }}
          draggable={false}
        >
          {primaryImageSrc ? (
            <>
              <Image
                src={primaryImageSrc}
                alt={productName}
                fill
                draggable={false}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                fetchPriority={priority ? "high" : "auto"}
                loading={priority ? "eager" : "lazy"}
                className={cn(
                  "object-cover transition-transform duration-500 ease-out",
                  "md:group-hover:scale-105",
                  isUnavailable && "scale-[1.01] grayscale-[30%] opacity-75",
                  (secondaryImageSrc && !isUnavailable) && "md:group-hover:opacity-0"
                )}
                {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
              />
              {secondaryImageSrc && !isUnavailable && (
                <div className="hidden md:block">
                  <Image
                    src={secondaryImageSrc}
                    alt={`${productName} alternate view`}
                    fill
                    draggable={false}
                    sizes="(max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                    className={cn(
                      "object-cover transition-opacity duration-500 ease-out absolute inset-0 opacity-0",
                      "md:group-hover:opacity-100 md:group-hover:scale-105",
                      isUnavailable && "scale-[1.01] grayscale-[30%] opacity-75"
                    )}
                    {...getBlurPlaceholderProps(secondaryImage.blurDataURL)}
                  />
                </div>
              )}
            </>
          ) : (
              <div className="flex size-full items-center justify-center" style={{ backgroundColor: resolvedBg }}>
              <ShoppingCart className="size-10 text-muted-foreground/30" />
            </div>
          )}

          {isUnavailable && (
            <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-none">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 text-destructive px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md">
                Out of Stock
              </div>
            </div>
          )}
        </Link>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 bg-card px-3 pb-3 pt-3 @max-[220px]:p-2.5 @max-[220px]:gap-1.5 sm:p-4">
          <>
            <Link
              href={productHref}
              prefetch={false}
              scroll={true}
              className="block text-left"
              draggable={false}
            >
              <h3
                className="line-clamp-2 text-[13px] font-medium leading-[1.3] text-foreground/90 @min-[260px]:text-[14px] sm:text-[15px]"
                draggable={false}
              >
                {productName}
              </h3>
            </Link>

            <div className="mt-auto flex flex-row items-end justify-between gap-3 pt-3 sm:pt-4">
              {!isPreviewMode && (
                <>
                  <div className="flex flex-col items-start gap-1 sm:gap-1.5 flex-1 min-w-0">
                    <p
                      className="text-[15px] font-bold leading-none text-foreground tabular-nums @min-[260px]:text-[16px] sm:text-[18px]"
                      draggable={false}
                    >
                      {formatPrice(sellingPrice)}
                    </p>
                    {compareAtPrice ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className="text-[13px] font-normal leading-none text-muted-foreground/60 line-through @min-[260px]:text-[14px] sm:text-[15px]"
                          draggable={false}
                        >
                          {formatPrice(compareAtPrice)}
                        </p>
                        <Badge className="pointer-events-auto w-fit rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success tracking-normal border-none shadow-none h-[22px] inline-flex items-center whitespace-nowrap sm:px-2 sm:text-[12px] sm:h-[24px]">
                          Save {formatPrice(compareAtPrice - sellingPrice)}
                        </Badge>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 mb-0.5">
                    <ProductCardAddToCartButton product={product} isOutOfStock={isUnavailable} mode="icon" />
                  </div>
                </>
              )}
            </div>
          </>
      </CardContent>
    </Card>
  );
}

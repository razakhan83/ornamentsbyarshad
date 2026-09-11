"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Edit,
  Image as ImageIcon,
  ExternalLink,
  PackageOpen,
  Tag,
  Settings2,
  BarChart2,
  Loader2,
  X,
} from "lucide-react";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { getProductDetailsAction } from "@/app/actions";
import { getProductUnitPrice, getVisibleCompareAtPrice, getCompareAtOffPercent } from "@/lib/productCommerce";

export function ProductQuickViewDialog({ open, onOpenChange, product: rowProduct, categoryOptions }) {
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(() => {
    let active = true;
    if (open && rowProduct?._id && detailProduct?._id !== rowProduct._id) {
      getProductDetailsAction(rowProduct._id)
        .then((fullProduct) => {
          if (active && fullProduct) setDetailProduct(fullProduct);
        })
        .catch(console.error);
    }
    return () => {
      active = false;
    };
  }, [open, rowProduct?._id, detailProduct?._id]);

  const isLoading = open && Boolean(rowProduct?._id) && detailProduct?._id !== rowProduct?._id;
  const product = detailProduct || rowProduct;

  if (!product) return null;

  const categoryNames = (product.Category ?? [])
    .map((catId) => {
      const id = typeof catId === "object" && catId ? catId._id : catId;
      const option = categoryOptions?.find((o) => o.id === id || o._id === id);
      return option ? option.label : typeof catId === "object" ? catId.name : null;
    })
    .filter(Boolean);

  const images =
    product.Images?.length > 0
      ? product.Images
      : product.ImageUrl
      ? [{ url: product.ImageUrl }]
      : [];

  const displayPrice = getProductUnitPrice(product);
  const compareAtPrice = getVisibleCompareAtPrice(product, displayPrice);
  const offPercent = getCompareAtOffPercent(product, displayPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full-screen on mobile, large centered modal on desktop */}
      <DialogContent
        showCloseButton={false}
        className="w-screen h-[100dvh] max-w-none m-0 rounded-none p-0 flex flex-col overflow-hidden border-0 bg-background
                   sm:w-[96vw] sm:max-w-6xl sm:h-[90vh] sm:max-h-[90vh] sm:m-auto sm:rounded-2xl sm:border sm:shadow-2xl"
      >
        {/* ── Layout: stacked on mobile, side-by-side on desktop ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* ════════ LEFT: Image Gallery (desktop only) ════════ */}
          <div className="hidden md:flex flex-col w-[42%] shrink-0 bg-muted/20 border-r border-border/60 overflow-y-auto">
            <div className="p-6 flex flex-col gap-4 h-full">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <ImageIcon className="size-3.5" /> Media Gallery
              </p>

              {isLoading && images.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="w-full aspect-square rounded-xl" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="aspect-square rounded-lg" />
                    <Skeleton className="aspect-square rounded-lg" />
                  </div>
                </div>
              ) : images.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-border/40 bg-white shadow-sm">
                    <Image
                      src={images[0].url}
                      alt="Main product image"
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      {...getBlurPlaceholderProps(images[0].blurDataURL)}
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {images.slice(1).map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-lg overflow-hidden border border-border/40 bg-white shadow-sm hover:ring-2 hover:ring-primary/30 transition-all"
                        >
                          <Image
                            src={img.url}
                            alt={`Thumbnail ${idx + 2}`}
                            fill
                            className="object-cover"
                            {...getBlurPlaceholderProps(img.blurDataURL)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 text-muted-foreground min-h-[200px]">
                  <PackageOpen className="size-12 mb-3 opacity-20" />
                  <span className="text-sm font-medium">No images uploaded</span>
                </div>
              )}
            </div>
          </div>

          {/* ════════ RIGHT: Details Panel ════════ */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

            {/* ── Header bar (sticky) ── */}
            <DialogHeader className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-background">
              <div className="flex items-start justify-between gap-3">
                {/* Title + badges */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {product.showOnStore ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] sm:text-xs px-2 py-0">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-2 py-0">
                        Draft
                      </Badge>
                    )}
                    {product.StockStatus === "In Stock" ? (
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-2 py-0">
                        In Stock ({product.stockQuantity || 0})
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] sm:text-xs px-2 py-0">
                        Out of Stock
                      </Badge>
                    )}
                    {product.isFeatured && (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] sm:text-xs px-2 py-0">
                        🌟 Featured (Ads)
                      </Badge>
                    )}
                    {product.isNewArrival && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] sm:text-xs px-2 py-0">
                        🆕 New Arrival
                      </Badge>
                    )}
                    {product.isBestSelling && (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] sm:text-xs px-2 py-0">
                        🔥 Best Seller
                      </Badge>
                    )}
                    {isLoading && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" /> Loading…
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-base sm:text-2xl font-bold leading-snug text-foreground pr-2 line-clamp-2">
                    {product.Name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Product details for {product.Name}
                  </DialogDescription>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/admin/products/edit/${product._id}`}
                    className={buttonVariants({ variant: "default", size: "sm", className: "rounded-full hidden sm:flex px-4 h-8 text-xs" })}
                  >
                    <Edit className="size-3 mr-1.5" />
                    Edit
                  </Link>
                  <Link
                    href={`/admin/products/edit/${product._id}`}
                    className={buttonVariants({ variant: "default", size: "icon", className: "rounded-full sm:hidden size-8" })}
                  >
                    <Edit className="size-3.5" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full size-8 text-muted-foreground hover:bg-muted"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* ── Scrollable content ── */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-5 p-4 sm:p-6">

                {/* Mobile image gallery */}
                <div className="md:hidden space-y-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <ImageIcon className="size-3" /> Photos
                  </p>
                  {images.length > 0 ? (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory -mx-4 px-4">
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative shrink-0 w-[75vw] aspect-square rounded-xl overflow-hidden border border-border/40 shadow-sm snap-start"
                        >
                          <Image
                            src={img.url}
                            alt={`Product image ${idx + 1}`}
                            fill
                            className="object-cover"
                            {...getBlurPlaceholderProps(img.blurDataURL)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex aspect-[2/1] items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/10 text-muted-foreground">
                      <PackageOpen className="size-8 opacity-20 mr-2" />
                      <span className="text-xs">No images uploaded</span>
                    </div>
                  )}
                </div>

                {/* Pricing + Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pricing card */}
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <Tag className="size-3" /> Pricing
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                      <span className="text-sm sm:text-base text-muted-foreground font-medium mr-1">PKR</span>
                      {Number(displayPrice).toLocaleString("en-PK")}
                    </p>
                    {compareAtPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">
                          PKR {Number(compareAtPrice).toLocaleString("en-PK")}
                        </span>
                        {offPercent > 0 ? (
                          <Badge className="bg-rose-100 text-rose-600 border-rose-200 text-[10px] font-bold px-1.5 shadow-none">
                            -{offPercent}%
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Categories card */}
                  <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <Settings2 className="size-3" /> Categories
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryNames.length > 0 ? (
                        categoryNames.map((name) => (
                          <Badge key={name} variant="outline" className="text-xs rounded-full px-2.5 py-0.5 font-medium">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2.5">
                  <h3 className="text-sm font-semibold text-foreground">Description</h3>
                  {isLoading && !product.Description ? (
                    <div className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-[90%]" />
                      <Skeleton className="h-3.5 w-[80%]" />
                    </div>
                  ) : product.Description ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border/40 bg-muted/5 p-4 text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: product.Description }}
                    />
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/5 p-6">
                      <p className="text-sm text-muted-foreground text-center">No description added yet.</p>
                    </div>
                  )}
                </div>

                {/* SEO */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <BarChart2 className="size-3.5 text-muted-foreground" /> SEO Preview
                    </h3>
                    {product.slug && (
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View Live <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>

                  {isLoading && !product.seoTitle && !product.seoDescription ? (
                    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/5 p-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-[60%]" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                          Title
                        </span>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {product.seoTitle || product.Name}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                          Description
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {product.seoDescription || "No meta description set."}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1">
                          URL Slug
                        </span>
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono break-all">
                          /{product.slug || "---"}
                        </code>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
            {/* ── End scrollable content ── */}

          </div>
          {/* ── End right panel ── */}

        </div>
        {/* ── End layout ── */}

      </DialogContent>
    </Dialog>
  );
}

export default ProductQuickViewDialog;

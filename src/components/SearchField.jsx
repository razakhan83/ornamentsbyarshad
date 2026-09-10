"use client";

import Image from "next/image";
import { ArrowRight, Search, TrendingUp, LayoutGrid, X } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from "@/lib/cloudinaryImage";
import { getProductCategoryNames } from "@/lib/productCategories";
import { cn } from "@/lib/utils";
import { getPrimaryProductImage } from "@/lib/productImages";
import { getBlurPlaceholderProps } from "@/lib/imagePlaceholder";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchField({
  value,
  onChange,
  onSubmit,
  onClear,
  onFocus,
  isFocused,
  suggestions = [],
  categories = [],
  trending = [],
  emptyLabel,
  className,
  inputClassName,
  buttonLabel = "Search",
  showSuggestions = true,
  isLoading = false,
  placeholder = "Search products",
  autoFocus = false,
  inlineSuggestions = false,
}) {
  const hasQuery = Boolean(value.trim());
  const showPanel = showSuggestions && isFocused;
  const showDiscovery = showPanel && !hasQuery;
  const showResults = showPanel && hasQuery;

  return (
    <div className={cn("relative w-full", className)}>
      <form onSubmit={onSubmit} className="flex w-full items-center">
        <InputGroup
          className={cn(
            "min-h-12 rounded-xl border border-muted-foreground/20 bg-muted/40 transition-all hover:bg-muted/60 hover:border-muted-foreground/30 focus-within:bg-background focus-within:border-primary/40 focus-within:shadow-[0_0_0_1px_rgba(1,83,71,0.2)]"
          )}
        >
          <InputGroupAddon align="inline-start" className="pl-4 text-primary/75">
            <InputGroupText>
              <Search className="size-4" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            autoFocus={autoFocus}
            aria-label={placeholder || "Search products"}
            className={cn(
              "h-12 min-w-0 border-0 bg-transparent pl-11 pr-10 text-sm text-foreground shadow-none outline-none ring-0 transition-none placeholder:text-muted-foreground/80",
              "hover:border-0 hover:bg-transparent hover:shadow-none",
              "focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:ring-0",
              "aria-invalid:border-0 aria-invalid:bg-transparent aria-invalid:shadow-none aria-invalid:ring-0",
              "md:text-[0.95rem]",
              inputClassName
            )}
            placeholder={placeholder}
          />
          <InputGroupAddon align="inline-end" className="gap-1.5 pr-2">
            {value ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onClear}
                aria-label="Clear search"
                className="rounded-xl text-muted-foreground hover:bg-muted mr-1.5"
              >
                <X />
              </InputGroupButton>
            ) : null}
          </InputGroupAddon>
        </InputGroup>
      </form>

      {showDiscovery ? (
        <div
          className={cn(
            "w-full overflow-hidden",
            inlineSuggestions
              ? "mt-3 bg-transparent border-0 shadow-none"
              : "absolute top-full z-40 mt-3 rounded-xl border border-border/80 bg-popover/98 shadow-lg backdrop-blur"
          )}
        >
          <div className="flex flex-col gap-4 p-4">
            {categories.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-foreground/80">
                  <LayoutGrid className="size-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Popular categories</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id || category.slug || category.label}
                      type="button"
                      onClick={() => category.onSelect?.(category)}
                      className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {category.label || category.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {trending.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-foreground/80">
                  <TrendingUp className="size-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Trending products</p>
                </div>
                <ul className="divide-y divide-border/70 rounded-lg border border-border/50 overflow-hidden">
                  {trending.map((product, index) => (
                    <li key={`${product._id || product.id || "trend"}-${index}`}>
                      <button
                        type="button"
                        onClick={() => product.onSelect?.(product)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted"
                      >
                        <span className="truncate text-sm font-medium">{product.Name || product.name}</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showResults ? (
        <div 
          className={cn(
            "w-full overflow-hidden",
            inlineSuggestions
              ? "mt-3 bg-transparent border-0 shadow-none"
              : "absolute top-full z-40 mt-3 rounded-xl border border-border/80 bg-popover/98 shadow-lg backdrop-blur"
          )}
        >
          {isLoading ? (
            <ul className="divide-y divide-border/70">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="flex w-full items-center gap-3 px-4 py-3">
                  <Skeleton className="size-12 rounded-xl shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="size-4 rounded-full shrink-0" />
                </li>
              ))}
            </ul>
          ) : suggestions.length ? (
            <ul className="divide-y divide-border/70">
              {suggestions.map((product, index) => {
                const primaryImage = getPrimaryProductImage(product);
                const primaryImageSrc = primaryImage?.url
                  ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.searchSuggestion)
                  : "";

                return (
                <li key={`${product._id || product.id || "result"}-${index}`}>
                  <button
                    type="button"
                    onClick={() => product.onSelect?.(product)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted"
                  >
                    <div className="relative size-12 overflow-hidden rounded-xl border border-border/80 bg-muted shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
                      {primaryImageSrc ? (
                        <Image
                          src={primaryImageSrc}
                          alt={product.Name || product.name || "product"}
                          fill
                          sizes="48px"
                          className="object-cover"
                          {...getBlurPlaceholderProps(primaryImage?.blurDataURL)}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{product.Name || product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getProductCategoryNames(product).join(", ") || "Uncategorized"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <Image
                src="/undraw_no-data_ig65.svg"
                alt="No products found"
                width={80}
                height={55}
                className="h-12 w-auto object-contain opacity-85 select-none mb-1"
              />
              <span className="text-xs sm:text-sm font-medium">{emptyLabel || `No products found for "${value}"`}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

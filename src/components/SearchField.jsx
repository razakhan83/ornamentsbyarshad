import { useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Search, X } from "lucide-react";

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
  onClose,
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
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const hasQuery = Boolean(value.trim());
  const showPanel = showSuggestions && isFocused;
  const showDiscovery = showPanel && !hasQuery;
  const showResults = showPanel && hasQuery;

  // Handle click outside & escape key to close suggestions
  useEffect(() => {
    if (!showPanel) return;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
        inputRef.current?.blur();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPanel, onClose]);

  const handleClose = () => {
    onClose?.();
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={cn("relative w-full select-none", className)}>
      <form onSubmit={onSubmit} className="relative z-40 flex w-full items-center">
        <InputGroup
          className={cn(
            "min-h-11 rounded-none border border-[#E8E5DF] bg-white transition-all hover:border-[#121212]/50 focus-within:border-[#121212] focus-within:ring-0 shadow-none",
            showPanel && "border-[#121212]"
          )}
        >
          <InputGroupAddon align="inline-start" className="pl-3.5 text-neutral-400">
            <InputGroupText>
              <Search className="size-4 text-[#121212]/60" strokeWidth={1.8} />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            autoFocus={autoFocus}
            aria-label={placeholder || "Search products"}
            className={cn(
              "h-11 min-w-0 border-0 bg-transparent pl-10 pr-16 text-xs font-sans tracking-wide text-[#121212] shadow-none outline-none ring-0 transition-none placeholder:text-neutral-400",
              "hover:border-0 hover:bg-transparent hover:shadow-none",
              "focus-visible:border-0 focus-visible:bg-transparent focus-visible:shadow-none focus-visible:ring-0",
              "aria-invalid:border-0 aria-invalid:bg-transparent aria-invalid:shadow-none aria-invalid:ring-0",
              inputClassName
            )}
            placeholder={placeholder}
          />
          <InputGroupAddon align="inline-end" className="pr-2">
            {value ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onClear}
                aria-label="Clear search"
                className="size-7 rounded-none text-neutral-400 hover:text-[#121212] hover:bg-black/5"
                title="Clear search"
              >
                <X className="size-3.5" />
              </InputGroupButton>
            ) : showPanel ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={handleClose}
                aria-label="Close suggestions"
                className="size-7 rounded-none text-neutral-400 hover:text-[#121212] hover:bg-black/5"
                title="Close"
              >
                <X className="size-3.5" />
              </InputGroupButton>
            ) : null}
          </InputGroupAddon>
        </InputGroup>
      </form>

      {/* Discovery Suggestions Dropdown (Popular Categories & Trending) */}
      {showDiscovery ? (
        <div
          className={cn(
            "w-full overflow-hidden",
            inlineSuggestions
              ? "mt-2 bg-transparent border-0 shadow-none"
              : "absolute top-full z-40 mt-1.5 rounded-none border border-[#E8E5DF] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] animate-in fade-in-0 duration-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2 border-b border-[#F0ECE1]">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Suggestions
            </span>
          </div>

          <div className="flex flex-col gap-4 p-5">
            {categories.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Popular Collections
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id || category.slug || category.label}
                      type="button"
                      onClick={() => category.onSelect?.(category)}
                      className="text-xs font-sans font-medium text-[#121212]/80 hover:text-[#A67C52] transition-colors cursor-pointer select-none py-0.5 underline-offset-4 hover:underline"
                    >
                      {category.label || category.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {trending.length > 0 ? (
              <div className="flex flex-col gap-2 pt-3 border-t border-[#F0ECE1]">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Trending Jewelry
                </span>
                <div className="flex flex-col">
                  {trending.slice(0, 5).map((product, index) => (
                    <button
                      key={`${product._id || product.id || "trend"}-${index}`}
                      type="button"
                      onClick={() => product.onSelect?.(product)}
                      className="flex w-full items-center justify-between py-2 text-left text-[#121212]/85 hover:text-[#A67C52] transition-colors cursor-pointer group"
                    >
                      <span className="truncate text-xs font-medium">
                        {product.Name || product.name}
                      </span>
                      <ArrowRight className="size-3 text-neutral-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Query Search Results */}
      {showResults ? (
        <div 
          className={cn(
            "w-full overflow-hidden",
            inlineSuggestions
              ? "mt-2 bg-transparent border-0 shadow-none"
              : "absolute top-full z-40 mt-1.5 rounded-none border border-[#E8E5DF] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] animate-in fade-in-0 duration-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2 border-b border-[#F0ECE1]">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Matching Jewelry
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col divide-y divide-neutral-100 p-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex w-full items-center gap-3 py-2.5 px-2">
                  <Skeleton className="size-9 rounded-none shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length ? (
            <div className="flex flex-col p-2">
              {suggestions.map((product, index) => {
                const primaryImage = getPrimaryProductImage(product);
                const primaryImageSrc = primaryImage?.url
                  ? optimizeCloudinaryUrl(primaryImage.url, CLOUDINARY_IMAGE_PRESETS.searchSuggestion)
                  : "";

                return (
                  <button
                    key={`${product._id || product.id || "result"}-${index}`}
                    type="button"
                    onClick={() => product.onSelect?.(product)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50/80 transition-colors cursor-pointer group rounded"
                  >
                    <div className="relative size-9 overflow-hidden bg-[#F4F2EE] shrink-0">
                      {primaryImageSrc ? (
                        <Image
                          src={primaryImageSrc}
                          alt={product.Name || product.name || "product"}
                          fill
                          sizes="36px"
                          className="object-cover"
                          {...getBlurPlaceholderProps(primaryImage?.blurDataURL)}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[#121212] group-hover:text-[#A67C52] transition-colors">{product.Name || product.name}</p>
                      <p className="truncate text-[10px] text-neutral-400">
                        {getProductCategoryNames(product).join(", ") || "Jewelry"}
                      </p>
                    </div>
                    <ArrowRight className="size-3 text-neutral-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-medium text-neutral-500">{emptyLabel || `No jewelry found for "${value}"`}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}



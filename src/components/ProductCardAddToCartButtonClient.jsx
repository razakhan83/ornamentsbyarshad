'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, BellRing } from 'lucide-react';

import { useCartActions } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { flyToCart } from '@/lib/flyToCart';
import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

export default function ProductCardAddToCartButtonClient({ product, isOutOfStock = false, mode = "full" }) {
  const router = useRouter();
  const { addToCart } = useCartActions() || {};
  const [animationState, setAnimationState] = useState('idle');
  const settleTimeoutRef = useRef(null);

  const isLoading = animationState === 'loading';
  const isBusy = animationState !== 'idle';

  const pathname = usePathname();

  useEffect(() => {
    setAnimationState('idle');
    return () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, [pathname]);

  async function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isOutOfStock || isBusy || !addToCart) return;

    const sourceEl = event.currentTarget;
    const rawImage =
      product?.Images?.[0]?.url || product?.images?.[0]?.url || (typeof product?.images?.[0] === 'string' ? product.images[0] : '') || product?.image || product?.Image || '';
    const imageSrc = rawImage
      ? optimizeCloudinaryUrl(rawImage, CLOUDINARY_IMAGE_PRESETS.cartItem)
      : '';

    // Trigger lightweight 60fps fly-to-cart animation
    flyToCart({ sourceEl, imageSrc });

    setAnimationState('loading');
    try {
      const startedAt = performance.now();
      const [result] = await Promise.all([
        addToCart(product),
        new Promise((resolve) => {
          window.requestAnimationFrame(() => {
            const elapsed = performance.now() - startedAt;
            const remaining = Math.max(220 - elapsed, 0);
            window.setTimeout(resolve, remaining);
          });
        }),
      ]);

      if (!result?.success) {
        setAnimationState('idle');
        return;
      }

      setAnimationState('settling');
      settleTimeoutRef.current = window.setTimeout(() => {
        setAnimationState('idle');
        settleTimeoutRef.current = null;
      }, 80);
    } finally {
      if (settleTimeoutRef.current === null) {
        setAnimationState('idle');
      }
    }
  }

  if (mode === 'icon') {
    if (isOutOfStock) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const productSlug = product.slug || product._id || product.id;
            router.push(`/products/${productSlug}`);
          }}
          className="inline-flex shrink-0 size-9 sm:size-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 outline-none transition-all duration-300 ease-out hover:bg-slate-200 hover:text-slate-900 hover:scale-[1.15] active:scale-[0.85] focus-visible:ring-2 focus-visible:ring-ring/50 shadow-sm"
          aria-label="Notify Me"
          title="Notify Me When In Stock"
        >
          <span className="relative block size-4.5 sm:size-5">
            <BellRing className="absolute inset-0 size-4.5 sm:size-5 transition-all duration-300 ease-out" />
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={isBusy}
        onClick={handleAddToCart}
        data-state={animationState}
        aria-busy={isBusy}
        className={cn(
          "inline-flex shrink-0 size-9 sm:size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 outline-none transition-all duration-300 ease-out hover:bg-emerald-200 hover:text-emerald-800 hover:scale-[1.15] active:scale-[0.85] focus-visible:ring-2 focus-visible:ring-ring/50",
          (isBusy || isLoading) && "pointer-events-none opacity-60"
        )}
        aria-label="Add to cart"
      >
        <span className="relative block size-4.5 sm:size-5">
          {isLoading ? (
            <Spinner className="absolute inset-0 size-4.5 sm:size-5" />
          ) : (
            <ShoppingCart className="absolute inset-0 size-4.5 sm:size-5 transition-all duration-300 ease-out" />
          )}
        </span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      disabled={isBusy || isOutOfStock}
      onMouseEnter={() => {
        if (isOutOfStock) return;
        const productSlug = product.slug || product._id || product.id;
        router.prefetch(`/products/${productSlug}`);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOutOfStock || isBusy) return;
        setAnimationState('loading');
        const productSlug = product.slug || product._id || product.id;
        router.push(`/products/${productSlug}`);
        
        // Reset loading state after a delay in case navigation takes too long or user navigates back
        settleTimeoutRef.current = window.setTimeout(() => {
          setAnimationState('idle');
        }, 1200);
      }}
      data-state={animationState}
      aria-busy={isBusy}
      className={cn(
        "group w-full rounded-lg font-semibold transition-all duration-300 ease-out h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-[13px] border border-solid shadow-sm relative overflow-hidden",
        isOutOfStock
          ? "cursor-not-allowed text-muted-foreground/80 bg-[#f3f4f6] border-transparent"
          : "bg-primary text-white border-transparent hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(1,83,71,0.3)] hover:-translate-y-0.5 active:scale-[0.98]"
      )}
      aria-label={isOutOfStock ? "Out of Stock" : "Buy Now"}
    >
      <span className="relative flex items-center justify-center">
        {isLoading ? (
          <Spinner className="size-4 mr-1.5" />
        ) : null}
        <span>{isOutOfStock ? "Out of Stock" : "Buy Now"}</span>
        {!isOutOfStock && !isLoading && (
          <ShoppingCart className="absolute left-full ml-1.5 size-3.5 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
        )}
      </span>
    </Button>
  );
}

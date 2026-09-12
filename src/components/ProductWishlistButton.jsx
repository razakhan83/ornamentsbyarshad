'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';

export default function ProductWishlistButton({ product, mode = 'grid', className = '' }) {
  const { isWishlisted, toggleWishlist, isLoading = false } = useWishlist() || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const productId = String(product?._id || product?.id || product?.slug || '').trim();
  const active = typeof isWishlisted === 'function' ? isWishlisted(productId) : false;
  const productName = product?.Name || product?.name || 'Item';

  async function handleToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!productId || typeof toggleWishlist !== 'function' || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      const nextAction = active ? 'removed from' : 'saved to';
      const result = await toggleWishlist(product);

      if (result?.success) {
        toast.success(`${productName} ${nextAction} wishlist.`);
        return;
      }

      toast.error(`Unable to update wishlist for ${productName} right now.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mode === 'icon-only') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={active}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={handleToggle}
        disabled={isSubmitting || isLoading}
        className={cn(
          'inline-flex items-center justify-center p-0 bg-transparent border-0 shadow-none text-[#121212] hover:text-[#A67C52] transition-transform duration-200 active:scale-90 cursor-pointer select-none',
          active && 'text-red-500',
          (isSubmitting || isLoading) && 'pointer-events-none opacity-70',
          className
        )}
      >
        <Heart className={cn('size-6 stroke-[1.8] drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] transition-colors', active && 'fill-red-500 stroke-red-500')} />
      </button>
    );
  }

  if (mode === 'detail') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={active}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={handleToggle}
        disabled={isSubmitting || isLoading}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color:color-mix(in_oklab,var(--color-primary)_16%,var(--color-border))] bg-[color:color-mix(in_oklab,var(--color-input)_92%,white)] px-4 text-sm font-medium text-foreground shadow-[0_1px_0_color-mix(in_oklab,var(--color-background)_65%,white)] transition-[border-color,background-color,box-shadow,color,transform] duration-200 hover:bg-[color:color-mix(in_oklab,var(--color-muted)_74%,white)] hover:text-foreground active:scale-[0.96]',
          active && 'border-destructive/25 text-destructive',
          (isSubmitting || isLoading) && 'pointer-events-none opacity-70',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-destructive stroke-destructive')} />
        <span className="hidden sm:inline">{active ? 'Saved' : 'Save'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      data-slot="checkbox"
      data-state={active ? 'checked' : 'unchecked'}
      value="on"
      onClick={handleToggle}
      disabled={isSubmitting || isLoading}
      className={cn(
        "absolute right-2.5 top-2.5 z-20 flex size-8 sm:size-9 items-center justify-center rounded-full border border-[#E8E5DF] bg-white/95 text-[#121212] shadow-xs outline-none transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer",
        active
          ? 'border-red-500/30 text-red-500 opacity-100'
          : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
        (isSubmitting || isLoading) && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <span className="relative block size-4 sm:size-4.5">
        <Heart
          className={cn(
            'absolute inset-0 size-4 sm:size-4.5 transition-all duration-300 ease-out text-[#121212] hover:text-red-500',
            active ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
          )}
        />
        <Heart
          className={cn(
            'absolute inset-0 size-4 sm:size-4.5 fill-red-500 stroke-red-500 transition-all duration-300 ease-out',
            active ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        />
      </span>
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';

import { useCartActions } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MyWishlistButton({ className, isMobile = false, iconOnly = false }) {
  const { setIsSidebarOpen } = useCartActions() || {};
  const { wishlistCount = 0, isLoading = false } = useWishlist() || {};
  const router = useRouter();

  function handleClick() {
    if (typeof setIsSidebarOpen === 'function') {
      setIsSidebarOpen(false);
    }
    router.push('/wishlist');
  }

  if (isMobile) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'h-auto w-full justify-start rounded-xl bg-transparent px-3.5 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted',
          className
        )}
      >
        <Heart className="size-4" />
        Wishlist
        {!isLoading && wishlistCount > 0 ? (
          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
            {wishlistCount > 99 ? '99+' : wishlistCount}
          </span>
        ) : null}
      </Button>
    );
  }

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={handleClick}
        aria-label="Open wishlist"
        title="Wishlist"
        className={cn('relative overflow-visible', className)}
      >
        <Heart className="size-5" strokeWidth={1.5} />
        {!isLoading && wishlistCount > 0 ? (
          <span className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold leading-none text-primary-foreground">
            {wishlistCount > 99 ? '99+' : wishlistCount}
          </span>
        ) : null}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn('text-muted-foreground hover:bg-muted hover:text-foreground gap-2', className)}
    >
      <Heart className="size-4" />
      Wishlist
      {!isLoading && wishlistCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      ) : null}
    </Button>
  );
}

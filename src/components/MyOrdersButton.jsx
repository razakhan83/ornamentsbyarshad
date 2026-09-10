'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import { useCartActions } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MyOrdersButton({ className, isMobile = false, iconOnly = false }) {
  const { setIsSidebarOpen } = useCartActions() || {};
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/orders');
  }, [router]);

  const handleClick = () => {
    if (typeof setIsSidebarOpen === 'function') {
      setIsSidebarOpen(false);
    }
    router.push('/orders');
  };

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
        <Package className="size-4" />
        My Orders
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
        aria-label="Open my orders"
        title="My Orders"
        className={cn(className)}
      >
        <Package className="size-5" strokeWidth={1.5} />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn('text-muted-foreground hover:bg-muted hover:text-foreground gap-2', className)}
    >
      <Package className="size-4" />
      My Orders
    </Button>
  );
}

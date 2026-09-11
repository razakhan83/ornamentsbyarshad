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
    router.prefetch('/track-order');
  }, [router]);

  const handleClick = () => {
    if (typeof setIsSidebarOpen === 'function') {
      setIsSidebarOpen(false);
    }
    router.push('/track-order');
  };

  if (isMobile) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'h-auto w-full justify-start rounded-none bg-transparent px-3 py-2.5 text-left text-xs uppercase tracking-[0.16em] font-medium text-[#121212] hover:bg-[#F4F2EE]',
          className
        )}
      >
        <Package className="size-3.5" />
        Track Your Order
      </Button>
    );
  }

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label="Track your order"
        title="Track Your Order"
        className={cn('rounded-none', className)}
      >
        <Package className="size-4.5" strokeWidth={1.5} />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn('text-[#737373] hover:bg-[#F4F2EE] hover:text-[#121212] gap-2 rounded-none text-xs uppercase tracking-[0.16em]', className)}
    >
      <Package className="size-3.5" />
      Track Your Order
    </Button>
  );
}

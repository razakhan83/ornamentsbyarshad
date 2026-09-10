'use client';

import { useCallback, useTransition, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function ProductsSidebar({ categories = [], activeCategory = 'all' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingCategoryId, setPendingCategoryId] = useState(null);

  const buildUrl = useCallback((overrides = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    
    for (const [key, value] of Object.entries(overrides)) {
      if (value === 'all' || value === false) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    
    // Always reset to page 1 when filtering
    params.delete('page');

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  function handleCategoryClick(categoryId) {
    if (activeCategory === categoryId) return;
    setPendingCategoryId(categoryId);
    startTransition(() => {
      router.push(buildUrl({ category: categoryId }), { scroll: false });
    });
  }

  return (
    <aside className="hidden md:flex flex-col w-[240px] lg:w-[260px] shrink-0 gap-6 py-2 sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar pr-4">
      {/* Categories */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground px-1">Categories</h3>
        <div className="flex flex-col space-y-0.5">
          <button
            onClick={() => handleCategoryClick('all')}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left w-full cursor-pointer",
              activeCategory === 'all' 
                ? "bg-primary/10 text-primary font-bold" 
                : "text-foreground hover:bg-muted font-medium"
            )}
          >
            <span>All Products</span>
            {isPending && pendingCategoryId === 'all' && <Loader2 className="size-3.5 animate-spin opacity-70" />}
          </button>
          
          {categories.map((category) => {
            const catKey = category.slug || category.id || category._id;
            const isActive = activeCategory === category.id || activeCategory === category._id || activeCategory === category.slug;
            const isLoading = isPending && pendingCategoryId === catKey;
            return (
              <button
                key={category.id || category._id}
                onClick={() => handleCategoryClick(catKey)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left w-full cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-foreground hover:bg-muted font-medium"
                )}
              >
                <span className="truncate pr-2">{category.label}</span>
                {isLoading && <Loader2 className="size-3.5 animate-spin opacity-70 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

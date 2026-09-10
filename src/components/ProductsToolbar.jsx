'use client';

import { Suspense, useTransition } from 'react';
import { Grid2x2, Grid3x3, LayoutGrid, Search, SlidersHorizontal, Square } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductsFilterSheet from '@/components/ProductsFilterSheet';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'deals', label: 'Best Deals' },
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'az', label: 'Name: A to Z' },
  { value: 'za', label: 'Name: Z to A' },
];

const PRICE_PILLS = [
  { value: 'all', label: 'All Prices' },
  { value: 'under300', label: 'Under Rs. 300' },
  { value: 'under500', label: 'Under Rs. 500' },
  { value: '500-1500', label: 'Rs. 500 – 1.5K' },
  { value: '1500-5000', label: 'Rs. 1.5K – 5K' },
  { value: 'above5000', label: 'Above Rs. 5K' },
];

export default function ProductsToolbar({
  initialSearch = '',
  initialSort = 'newest',
  activeCategory = 'all',
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get('sort') || initialSort;
  const layout = searchParams.get('layout') || 'grid4';
  const currentPrice = searchParams.get('price') || 'all';

  function buildUrl(overrides = {}) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === 'all' || value === 'newest') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset page on filter/sort change
    params.delete('page');
    return `${pathname}?${params.toString()}`;
  }

  function handleChange(key, value) {
    startTransition(() => {
      router.push(buildUrl({ [key]: value }), { scroll: false });
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-2 md:pt-3 sm:px-6 md:px-8 lg:px-10 xl:px-14">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        {/* Left side: Mobile filter button + Desktop Quick Price Chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
          <div className="md:hidden shrink-0">
            <Suspense fallback={null}>
              <ProductsFilterSheet activeCategory={activeCategory} currentSort={currentSort} />
            </Suspense>
          </div>

          {/* Quick Price Pills on Desktop (and horizontal scroll on tablet) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {PRICE_PILLS.map((pill) => {
              const isSelected = currentPrice === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => handleChange('price', pill.value)}
                  className={cn(
                    'h-7.5 px-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer border select-none',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Sort and Layout */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">Sort:</span>
            <Select value={currentSort} onValueChange={(val) => handleChange('sort', val)}>
              <SelectTrigger className="h-8.5 w-auto border border-border/80 bg-background px-3 text-xs sm:text-sm font-semibold shadow-2xs focus:ring-1 focus:ring-primary/20 hover:bg-muted/40 rounded-lg">
                <SelectValue placeholder="Newest First" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs sm:text-sm font-medium">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-0.5 border-l border-border/60 pl-2">
            <button
              onClick={() => handleChange('layout', '1col')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${layout === '1col' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              title="1 per row (Mobile), 6 per row (PC)"
            >
              <Square className="size-3.5 sm:hidden" />
              <Grid3x3 className="size-4 hidden sm:block" />
            </button>
            <button
              onClick={() => handleChange('layout', '2col')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${layout === '2col' || !layout || layout === 'grid4' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              title="2 per row (Mobile), 4 per row (PC)"
            >
              <Grid2x2 className="size-3.5 sm:hidden" />
              <LayoutGrid className="size-4 hidden sm:block" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

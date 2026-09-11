'use client';

import { Suspense, useTransition } from 'react';
import { Grid2x2, Grid3x3, LayoutGrid, Search, SlidersHorizontal, Square } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductsFilterSheet from '@/components/ProductsFilterSheet';
import { cn } from '@/lib/utils';

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'gold', label: 'Gold Jewelry (🟡)' },
  { value: 'silver', label: 'Silver Jewelry (⚪)' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'deals', label: 'Best Deals' },
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'az', label: 'Name: A to Z' },
  { value: 'za', label: 'Name: Z to A' },
];

const METAL_PILLS = [
  { value: 'all', label: 'All Metals' },
  { value: 'gold', label: '🟡 Gold' },
  { value: 'silver', label: '⚪ Silver' },
];

const PRICE_PILLS = [
  { value: 'all', label: 'All Prices' },
  { value: 'under10k', label: 'Under Rs. 10K' },
  { value: '10k-30k', label: 'Rs. 10K – 30K' },
  { value: '30k-70k', label: 'Rs. 30K – 70K' },
  { value: '70k-150k', label: 'Rs. 70K – 150K' },
  { value: 'above150k', label: 'Above Rs. 150K' },
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
  const currentMetal = searchParams.get('metal') || 'all';

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
        {/* Left side: Mobile filter button + Desktop Quick Metal & Price Chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
          <div className="md:hidden shrink-0">
            <Suspense fallback={null}>
              <ProductsFilterSheet activeCategory={activeCategory} currentSort={currentSort} />
            </Suspense>
          </div>

          {/* Quick Metal Pills (Gold / Silver / All) */}
          <div className="flex items-center gap-1 shrink-0 border-r border-[#E8E5DF] pr-2 mr-1">
            {METAL_PILLS.map((pill) => {
              const isSelected = currentMetal === pill.value || (pill.value === 'gold' && currentSort === 'gold') || (pill.value === 'silver' && currentSort === 'silver');
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => handleChange('metal', pill.value)}
                  className={cn(
                    'h-8 px-2.5 sm:px-3 rounded-[6px] text-[11px] sm:text-xs uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer border select-none',
                    isSelected
                      ? 'bg-[#121212] text-white border-[#121212] shadow-xs'
                      : 'bg-white hover:border-[#A67C52]/50 text-[#737373] hover:text-[#121212] border-[#E8E5DF]'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Quick Price Pills on Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {PRICE_PILLS.map((pill) => {
              const isSelected = currentPrice === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => handleChange('price', pill.value)}
                  className={cn(
                    'h-8 px-3 rounded-[6px] text-xs uppercase tracking-wider font-semibold transition-all duration-200 cursor-pointer border select-none',
                    isSelected
                      ? 'bg-[#121212] text-white border-[#121212] shadow-xs'
                      : 'bg-white hover:border-[#121212]/40 text-[#737373] hover:text-[#121212] border-[#E8E5DF]'
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
            <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider hidden sm:inline">Sort:</span>
            <Select value={currentSort} onValueChange={(val) => handleChange('sort', val)}>
              <SelectTrigger className="h-8.5 w-auto border border-[#E8E5DF] bg-white px-3 text-xs sm:text-xs uppercase tracking-wider font-semibold focus:ring-1 focus:ring-[#121212] hover:bg-[#FAF9F6] rounded-[6px]">
                <SelectValue placeholder="Newest First" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-[8px] border border-[#E8E5DF] bg-white shadow-lg">
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs uppercase tracking-wider font-medium">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-0.5 border-l border-[#E8E5DF] pl-2">
            <button
              onClick={() => handleChange('layout', '1col')}
              className={`flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors cursor-pointer ${layout === '1col' ? 'bg-[#121212] text-white shadow-xs' : 'text-[#737373] hover:text-[#121212] hover:bg-neutral-100'}`}
              title="1 per row (Mobile), 6 per row (PC)"
            >
              <Square className="size-3.5 sm:hidden" />
              <Grid3x3 className="size-4 hidden sm:block" />
            </button>
            <button
              onClick={() => handleChange('layout', '2col')}
              className={`flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors cursor-pointer ${layout === '2col' || !layout || layout === 'grid4' ? 'bg-[#121212] text-white shadow-xs' : 'text-[#737373] hover:text-[#121212] hover:bg-neutral-100'}`}
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

'use client';

import { useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const PRICE_BUCKETS = [
  { value: 'under300', label: 'Under Rs. 300 (Dollar Store)' },
  { value: 'under500', label: 'Under Rs. 500' },
  { value: '500-1500', label: 'Rs. 500 – 1,500' },
  { value: '1500-5000', label: 'Rs. 1,500 – 5,000' },
  { value: 'above5000', label: 'Above Rs. 5,000' },
];

export default function ProductsFilterSheet({ activeCategory = 'all', currentSort = 'newest' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPrice = searchParams.get('price') || '';
  const currentInstock = searchParams.get('instock') === 'true';

  // Count active non-sort filters
  const activeFilterCount = [
    currentPrice ? 1 : 0,
    currentInstock ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const buildUrl = useCallback((overrides = {}) => {
    const params = new URLSearchParams();

    const price = 'price' in overrides ? overrides.price : currentPrice;
    const instock = 'instock' in overrides ? overrides.instock : currentInstock;
    const sort = 'sort' in overrides ? overrides.sort : currentSort;

    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (price) params.set('price', price);
    if (instock) params.set('instock', 'true');

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, activeCategory, currentPrice, currentInstock, currentSort]);

  function handlePriceChange(value) {
    router.push(buildUrl({ price: value }), { scroll: false });
  }

  function handleInstockChange(checked) {
    router.push(buildUrl({ instock: checked }), { scroll: false });
  }

  function handleClearAll() {
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    if (currentSort && currentSort !== 'newest') params.set('sort', currentSort);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Sheet>
      <SheetTrigger
        className="relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-semibold shadow-2xs transition-all outline-none hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="size-3.5 text-primary" />
        <span>Filters</span>
        {activeFilterCount > 0 ? (
          <span className="flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground leading-none shadow-xs">
            {activeFilterCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-0 md:side-right md:rounded-l-2xl md:rounded-t-none">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5 pr-14">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            Filter Products
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="text-[11px] font-semibold bg-muted text-muted-foreground">
                {activeFilterCount} active
              </Badge>
            ) : null}
          </SheetTitle>
          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              Clear All
            </Button>
          ) : null}
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          {/* Price Range */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Price Range
            </p>
            <ToggleGroup
              type="single"
              value={currentPrice}
              onValueChange={handlePriceChange}
              variant="outline"
              spacing={2}
              className="flex flex-wrap gap-2"
            >
              {PRICE_BUCKETS.map((bucket) => (
                <ToggleGroupItem
                  key={bucket.value}
                  value={bucket.value}
                  className="h-9 rounded-lg px-3.5 text-sm font-medium aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {bucket.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator />

          {/* In Stock Only */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="filter-instock" className="text-sm font-semibold text-foreground">
                In Stock Only
              </Label>
              <p className="text-xs text-muted-foreground">Hide out-of-stock items</p>
            </div>
            <Switch
              id="filter-instock"
              checked={currentInstock}
              onCheckedChange={handleInstockChange}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

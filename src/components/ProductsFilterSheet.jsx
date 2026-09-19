'use client';

import { useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

const PRICE_BUCKETS = [
  { value: 'under10k', label: 'Under Rs. 10,000' },
  { value: '10k-30k', label: 'Rs. 10,000 – 30,000' },
  { value: '30k-70k', label: 'Rs. 30,000 – 70,000' },
  { value: '70k-150k', label: 'Rs. 70,000 – 150,000' },
  { value: 'above150k', label: 'Above Rs. 150,000' },
];

export default function ProductsFilterSheet({ activeCategory = 'all', currentSort = 'newest' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPrice = searchParams.get('price') || '';
  const currentMetal = searchParams.get('metal') || '';
  const currentInstock = searchParams.get('instock') === 'true';

  // Count active non-sort filters
  const activeFilterCount = [
    currentPrice ? 1 : 0,
    currentMetal ? 1 : 0,
    currentInstock ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const buildUrl = useCallback((overrides = {}) => {
    const params = new URLSearchParams();

    const price = 'price' in overrides ? overrides.price : currentPrice;
    const metal = 'metal' in overrides ? overrides.metal : currentMetal;
    const instock = 'instock' in overrides ? overrides.instock : currentInstock;
    const sort = 'sort' in overrides ? overrides.sort : currentSort;

    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (price) params.set('price', price);
    if (metal) params.set('metal', metal);
    if (instock) params.set('instock', 'true');

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, activeCategory, currentPrice, currentMetal, currentInstock, currentSort]);

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
        className="relative inline-flex h-8.5 shrink-0 items-center justify-center gap-1.5 rounded-[6px] border border-[#121212]/30 bg-white px-3 text-xs uppercase tracking-wider font-semibold shadow-none transition-all outline-none hover:bg-[#121212] hover:text-white cursor-pointer select-none"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="size-3.5" />
        <span>Filters</span>
        {activeFilterCount > 0 ? (
          <span className="flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#A67C52] px-1 text-[10px] font-bold text-white leading-none shadow-xs">
            {activeFilterCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl border-t border-[#E8E5DF] bg-[#FAF9F6] px-0 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-0 md:side-right md:rounded-none">
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
          {/* Metal Type Filter Dropdown */}
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Metal Category
            </p>
            <Select
              value={currentMetal || 'all'}
              onValueChange={(val) => {
                const newMetal = val === 'all' ? '' : val;
                router.push(buildUrl({ metal: newMetal }), { scroll: false });
              }}
            >
              <SelectTrigger className="h-10 w-full border border-[#E8E5DF] bg-white px-3.5 text-xs uppercase tracking-wider font-semibold focus:ring-1 focus:ring-[#121212] rounded-[6px]">
                <SelectValue placeholder="All Metals" />
              </SelectTrigger>
              <SelectContent align="start" className="rounded-[8px] border border-[#E8E5DF] bg-white shadow-lg">
                <SelectItem value="all" className="text-xs uppercase tracking-wider font-medium">All Metals</SelectItem>
                <SelectItem value="gold" className="text-xs uppercase tracking-wider font-medium">Gold</SelectItem>
                <SelectItem value="silver" className="text-xs uppercase tracking-wider font-medium">Silver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

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
                  className="h-9 rounded-sm px-3.5 text-sm font-medium aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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

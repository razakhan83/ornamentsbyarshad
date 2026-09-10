'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Loader2, SearchX } from 'lucide-react';

import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { fetchMoreProductsAction } from '@/app/actions/catalog.actions';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export default function ProductsInfiniteGrid({
  initialProducts = [],
  total = 0,
  initialHasMore = false,
  layout = 'grid4',
  category = 'all',
  search = '',
  sort = 'newest',
  price = 'all',
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const sentinelRef = useRef(null);
  const loadingLockRef = useRef(false);

  // Sync state if server props change (e.g. user selects category or searches)
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1);
    setHasMore(initialHasMore);
    setIsLoading(false);
    loadingLockRef.current = false;
  }, [category, search, sort, price, initialProducts, initialHasMore]);

  // Load next chunk
  const loadNextBatch = useCallback(async () => {
    if (loadingLockRef.current || !hasMore || isLoading) return;

    loadingLockRef.current = true;
    setIsLoading(true);

    const nextPage = page + 1;

    try {
      const response = await fetchMoreProductsAction({
        category,
        search,
        sort,
        price,
        page: nextPage,
        limit: 20,
      });

      if (response?.success && Array.isArray(response.items) && response.items.length > 0) {
        setProducts((prev) => {
          // Avoid duplicate product ids if any overlap
          const existingIds = new Set(prev.map((p) => String(p._id || p.id || p.slug)));
          const uniqueNew = response.items.filter((p) => !existingIds.has(String(p._id || p.id || p.slug)));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(Boolean(response.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadingLockRef.current = false;
    }
  }, [category, hasMore, isLoading, page, price, search, sort]);

  // IntersectionObserver to auto-trigger when near bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingLockRef.current) {
          loadNextBatch();
        }
      },
      {
        root: null,
        rootMargin: '80px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadNextBatch]);

  // Grid layout class based on toolbar layout toggle
  let gridClassName;
  if (layout === '1col') {
    gridClassName = 'grid auto-rows-max grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
  } else {
    gridClassName = 'grid auto-rows-max grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
  }

  if (products.length === 0 && !isLoading) {
    return (
      <div className="products-page-empty relative mt-4 sm:mt-6 w-full">
        <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="mb-5 flex items-center justify-center">
            <Image
              src="/undraw_no-data_ig65.svg"
              alt="No products found"
              width={180}
              height={140}
              loading="lazy"
              className="h-auto w-[150px] sm:w-[180px] object-contain opacity-95 select-none"
            />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">No products found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {search
              ? `No products matched your search for "${search}".`
              : 'Try adjusting your search query, filters, or category to explore other items.'}
          </p>
          {search ? (
            <div className="mt-5">
              <Link
                href={category && category !== 'all' ? `/products?category=${category}` : '/products'}
                className="h-10 px-5 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm shadow-none transition-all active:scale-[0.98]"
              >
                Clear Search &amp; View All Products
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Total items badge */}
      <div className="products-page-results-meta mb-3 flex min-w-0 items-center justify-between gap-3 px-1 sm:mb-4">
        <p className="text-sm font-medium text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{products.length}</span> of{' '}
          <span className="font-semibold text-foreground">{total || products.length}</span> items
        </p>
      </div>

      {/* Main product cards grid */}
      <div className={gridClassName}>
        {products.map((product, index) => {
          // Newly loaded batches get staggered reveal delay
          const isInitialBatch = index < 20;
          const staggerDelay = `${(index % 20) * 35}ms`;

          return (
            <div
              key={`${product.slug || product._id || product.id}-${index}`}
              className={cn(
                'products-grid-card w-full min-w-0',
                !isInitialBatch && 'products-card-reveal'
              )}
              style={!isInitialBatch ? { '--reveal-delay': staggerDelay } : undefined}
            >
              <ProductCard product={product} priority={index < 4} />
            </div>
          );
        })}

        {/* Skeleton cards while next batch is in-flight */}
        {isLoading &&
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={`loading-skeleton-${idx}`} className="w-full min-w-0 animate-pulse">
              <ProductCardSkeleton />
            </div>
          ))}
      </div>

      {/* Sentinel trigger element for IntersectionObserver */}
      <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />

      {/* Loading indicator / End of catalog message */}
      <div className="my-8 flex w-full items-center justify-center">
        {isLoading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Loading more products...</span>
          </div>
        ) : !hasMore && products.length > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            <span>You&apos;ve viewed all {products.length} products</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

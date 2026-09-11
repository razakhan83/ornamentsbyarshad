import { Suspense } from 'react';

import ProductsInfiniteGrid from '@/components/ProductsInfiniteGrid';
import { ProductsNavigationFeedbackProvider, ProductsPendingResults } from '@/components/ProductsNavigationFeedback';
import ProductsPageHeader from '@/components/ProductsPageHeader';
import ProductsToolbar from '@/components/ProductsToolbar';
import ProductsSidebar from '@/components/ProductsSidebar';
import { ProductsGridSkeleton } from '@/components/ProductsPageSkeleton';
import { getProductsList, getStoreCategories } from '@/lib/data';

const PRODUCTS_PAGE_SIZE = 20;

function buildSuspenseKey(searchParams) {
  return JSON.stringify({
    category: searchParams?.category || 'all',
    search: searchParams?.search || '',
    sort: searchParams?.sort || 'newest',
    price: searchParams?.price || 'all',
    metal: searchParams?.metal || 'all',
    layout: searchParams?.layout || 'grid4',
  });
}

export async function generateMetadata({ searchParams }) {
  const params = (await searchParams) || {};
  const category = params.category || 'all';
  const search = params.search || '';
  const metal = params.metal || '';

  if (search) {
    return {
      title: `Search results for "${search}"`,
      description: `Browse matching Ornaments by Arshad jewelry pieces for "${search}".`,
    };
  }

  if (metal && metal !== 'all') {
    const metalLabel = metal.charAt(0).toUpperCase() + metal.slice(1);
    return {
      title: `${metalLabel} Jewelry Collection`,
      description: `Browse handcrafted ${metalLabel} jewelry pieces at Ornaments by Arshad.`,
    };
  }

  if (category && category !== 'all') {
    return {
      title: category === 'new-arrivals' ? 'New Arrivals' : 'Fine Jewelry Collection',
      description: 'Browse luxury jewelry collections by category at Ornaments by Arshad.',
    };
  }

  return {
    title: 'Fine Jewelry Collection',
    description: 'Browse the handcrafted luxury jewelry catalog at Ornaments by Arshad.',
  };
}

export default async function ProductsPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const categories = await getStoreCategories();
  const productsPromise = getProductsList({
    category: resolvedSearchParams.category || 'all',
    search: resolvedSearchParams.search || '',
    sort: resolvedSearchParams.sort || 'newest',
    price: resolvedSearchParams.price || 'all',
    metal: resolvedSearchParams.metal || 'all',
    page: 1,
    limit: PRODUCTS_PAGE_SIZE,
  });

  return (
    <ProductsNavigationFeedbackProvider>
      <div className="products-page-shell">
        <ProductsPageHeader
          categories={categories}
          activeCategory={resolvedSearchParams.category || 'all'}
          searchTerm={resolvedSearchParams.search || ''}
          sort={resolvedSearchParams.sort || 'newest'}
        />
        <ProductsToolbar
          initialSearch={resolvedSearchParams.search || ''}
          initialSort={resolvedSearchParams.sort || 'newest'}
          activeCategory={resolvedSearchParams.category || 'all'}
        />
        {/* overflow-x-hidden prevents any child from bleeding past the screen edge on mobile */}
        <section className="mx-auto w-full max-w-[1600px] overflow-x-hidden px-3 py-2 sm:overflow-x-visible sm:px-6 md:px-8 lg:px-10 xl:px-14">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-8 items-start relative">
            <ProductsSidebar 
              categories={categories} 
              activeCategory={resolvedSearchParams.category || 'all'} 
            />
            <div className="w-full min-w-0 flex-1">
              <Suspense key={buildSuspenseKey(resolvedSearchParams)} fallback={<ProductsGridSkeleton />}>
                <ProductsResultsContent 
                  productsPromise={productsPromise} 
                  layout={resolvedSearchParams.layout || 'grid4'} 
                  category={resolvedSearchParams.category || 'all'}
                  search={resolvedSearchParams.search || ''}
                  sort={resolvedSearchParams.sort || 'newest'}
                  price={resolvedSearchParams.price || 'all'}
                  metal={resolvedSearchParams.metal || 'all'}
                />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </ProductsNavigationFeedbackProvider>
  );
}

async function ProductsResultsContent({ productsPromise, layout, category, search, sort, price, metal }) {
  const data = await productsPromise;

  return (
    <ProductsPendingResults>
      <ProductsInfiniteGrid
        initialProducts={data.items || []}
        total={data.total || 0}
        initialHasMore={Boolean(data.hasMore)}
        layout={layout}
        category={category}
        search={search}
        sort={sort}
        price={price}
        metal={metal}
      />
    </ProductsPendingResults>
  );
}

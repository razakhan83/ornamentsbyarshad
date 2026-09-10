'use client';

import AppPagination from '@/components/AppPagination';

import { useProductsNavigationFeedback } from '@/components/ProductsNavigationFeedback';

function buildPageHref({ pathname, search, sort, category, page }) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort && sort !== 'newest') params.set('sort', sort);
  if (category && category !== 'all') params.set('category', category);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function ProductsPagination({
  pathname = '/products',
  page = 1,
  totalPages = 1,
  category = 'all',
  search = '',
  sort = 'newest',
}) {
  const { setCategoryPending } = useProductsNavigationFeedback();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="products-page-footer mt-8 flex flex-col items-center gap-4">
      <AppPagination
        page={page}
        totalPages={totalPages}
        onPendingChange={setCategoryPending}
        getHref={(nextPage) => buildPageHref({ pathname, category, search, sort, page: nextPage })}
      />

      <p className="text-center text-sm text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </p>
    </div>
  );
}

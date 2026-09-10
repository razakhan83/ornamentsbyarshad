import { Suspense } from 'react';
import { getAdminProductCategoryOptions, getAdminProductsPage } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';

import AdminProductsClient from './AdminProductsClient';

export default async function AdminProductsPage({ searchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const search = String(params?.search || '').trim();
  const status = String(params?.status || 'all').trim() || 'all';
  const stock = String(params?.stock || 'all').trim() || 'all';
  const category = String(params?.category || 'all').trim() || 'all';
  const sort = String(params?.sort || 'newest').trim() || 'newest';
  const page = Math.max(1, Number(params?.page) || 1);
  const [result, categoryOptions] = await Promise.all([
    getAdminProductsPage({ search, status, stock, category, sort, page, limit: 12 }),
    getAdminProductCategoryOptions(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading products...</div>}>
      <AdminProductsClient
        initialProducts={result.items}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.page}
        pageSize={result.limit}
        initialSearchQuery={result.searchTerm}
        initialStatusFilter={result.status}
        initialStockFilter={result.stock}
        initialCategoryFilter={result.category}
        initialSortOption={result.sort}
        categoryOptions={categoryOptions}
        summary={result.summary}
      />
    </Suspense>
  );
}

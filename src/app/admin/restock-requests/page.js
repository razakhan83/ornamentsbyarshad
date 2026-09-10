import { Suspense } from 'react';
import { getAdminStockRequests } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import AdminRestockRequestsClient from './AdminRestockRequestsClient';

export const metadata = {
  title: 'Restock Requests | Admin Panel',
};

export default async function AdminRestockRequestsPage({ searchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = params?.status || 'all';
  const productSearch = String(params?.product || '').trim();
  
  const requests = await getAdminStockRequests({ page, limit: 20, status, productSearch });

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading requests...</div>}>
      <AdminRestockRequestsClient
        initialRequests={requests.items}
        total={requests.total}
        totalPages={requests.totalPages}
        currentPage={requests.page}
        initialStatus={status}
        initialProductSearch={productSearch}
      />
    </Suspense>
  );
}

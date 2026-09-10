import { Suspense } from 'react';
import { requireAdmin } from '@/lib/requireAdmin';
import { getAdminUsersPage } from '@/lib/data';
import AdminUsersClient from './AdminUsersClient';

export const metadata = {
  title: 'User Management | Admin',
};

export default async function AdminUsersPage({ searchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const search = String(params?.search || '').trim();
  const status = String(params?.status || 'all').trim() || 'all';
  const type = String(params?.type || 'registered').trim() || 'registered';
  const page = Math.max(1, Number(params?.page) || 1);
  const result = await getAdminUsersPage({ search, status, type, page, limit: 12 });

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading users...</div>}>
      <AdminUsersClient
        initialUsers={result.items}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.page}
        initialSearchQuery={result.searchTerm}
        initialStatusFilter={result.status}
        initialTypeFilter={result.type}
        summary={result.summary}
      />
    </Suspense>
  );
}

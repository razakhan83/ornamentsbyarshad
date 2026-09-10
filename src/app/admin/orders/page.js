import { Suspense } from 'react';
import { getAdminOrdersPage, getAdminTrashOrders, getStoreSettings } from '@/lib/data';
import { DEFAULT_ADMIN_FILTER_STATUS, DEFAULT_ORDER_STATUS } from '@/lib/order-status';
import { requireAdmin } from '@/lib/requireAdmin';
import AdminOrdersClient from './AdminOrdersClient';
import AdminOrdersSkeleton from './AdminOrdersSkeleton';

export const instant = false;

export default async function AdminOrdersPage({ searchParams }) {
  await requireAdmin();

  const params = await searchParams;
  const search = String(params?.search || '').trim();
  const status = String(params?.status || DEFAULT_ADMIN_FILTER_STATUS).trim() || DEFAULT_ADMIN_FILTER_STATUS;
  const paymentFilter = String(params?.paymentFilter || 'all').trim();
  
  const isExplicitAllDates = params?.allDates === '1' || params?.startDate === 'all';
  const startDate = isExplicitAllDates ? '' : String(params?.startDate || '').trim();
  const endDate = isExplicitAllDates ? '' : String(params?.endDate || '').trim();

  const page = Math.max(1, Number(params?.page) || 1);
  const initialCreateOrder = params?.createOrder === '1';
  const isAllOrdersTab = status === 'all';
  const isDateFiltered = Boolean(startDate || endDate);
  const limit = isAllOrdersTab ? (isDateFiltered ? 200 : 25) : 500;

  const [orders, trashOrders, settings] = await Promise.all([
    getAdminOrdersPage({ search, status, paymentFilter, startDate, endDate, page: isAllOrdersTab ? page : 1, limit }),
    getAdminTrashOrders(),
    getStoreSettings(),
  ]);

  return (
    <AdminOrdersClient
      initialOrders={orders.items}
      total={orders.total}
      totalPages={orders.totalPages}
      currentPage={orders.page}
      pageSize={orders.limit}
      initialSearchQuery={orders.searchTerm}
      initialStatusFilter={orders.status}
      initialPaymentFilter={orders.paymentFilter || 'all'}
      initialStartDate={orders.startDate}
      initialEndDate={orders.endDate}
      summary={orders.summary}
      initialCreateOrder={initialCreateOrder}
      initialTrashOrders={trashOrders}
      enableSecondaryNoc={settings?.enableSecondaryNoc === true}
    />
  );
}

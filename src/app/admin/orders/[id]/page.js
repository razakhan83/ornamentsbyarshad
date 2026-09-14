import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getOrderById, getOrderLogs, getCustomerOtherOrders } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import OrderDetailView from './OrderDetailView';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Order Details - Admin | Ornaments by Arshad`,
  };
}

export default async function AdminOrderDetailPage({ params }) {
  await connection();
  await requireAdmin();
  const { id } = await params;

  const [order, logs] = await Promise.all([
    getOrderById(id),
    getOrderLogs(id),
  ]);

  if (!order) {
    notFound();
  }

  // Fetch other orders by this customer phone number
  const customerOtherOrders = await getCustomerOtherOrders(order.customerPhone, order._id);

  return (
    <OrderDetailView
      order={order}
      logs={logs}
      customerOtherOrders={customerOtherOrders}
    />
  );
}

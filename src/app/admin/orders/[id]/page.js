import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getOrderById, getOrderLogs, getCustomerOtherOrders, getAdminSettings } from '@/lib/data';
import { trackNocParcel } from '@/lib/nocCourier';
import { requireAdmin } from '@/lib/requireAdmin';
import OrderDetailView from './OrderDetailView';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Order Details - Admin | China Unique`,
  };
}

export default async function AdminOrderDetailPage({ params }) {
  await connection();
  await requireAdmin();
  const { id } = await params;

  const [order, logs, settings] = await Promise.all([
    getOrderById(id),
    getOrderLogs(id),
    getAdminSettings(),
  ]);

  if (!order) {
    notFound();
  }

  // Fetch other orders by this customer phone number
  const customerOtherOrders = await getCustomerOtherOrders(order.customerPhone, order._id);

  // Fetch live NOC tracking timeline
  let nocTrackingDetail = [];
  const trackingNumber = (order.nocParcelNo || order.trackingNumber || order.nocThirdPartyNo || '').trim();
  if (trackingNumber) {
    try {
      const trackingRes = await trackNocParcel(trackingNumber, order.nocAccountId || 'portal_1');
      if (trackingRes?.Response === 'success' && Array.isArray(trackingRes?.detail)) {
        nocTrackingDetail = trackingRes.detail;
      }
    } catch {
      // Non-blocking fallback
    }
  }

  return (
    <OrderDetailView
      order={order}
      logs={logs}
      customerOtherOrders={customerOtherOrders}
      nocTrackingDetail={nocTrackingDetail}
      enableSecondaryNoc={settings?.enableSecondaryNoc === true}
    />
  );
}

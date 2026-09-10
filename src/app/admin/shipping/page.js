import { Suspense } from 'react';
import AdminShippingClient from './AdminShippingClient';
import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'Shipping Management - Admin',
  description: 'Manage delivery rates and free shipping threshold.',
};

export default async function ShippingPage() {
  await requireAdmin();
  const settings = await getAdminSettings();

  return (
    <div className="w-full py-2 md:py-6">
      <Suspense fallback={<div>Loading settings...</div>}>
        <AdminShippingClient initialSettings={settings} />
      </Suspense>
    </div>
  );
}

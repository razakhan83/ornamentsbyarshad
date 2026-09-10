import { requireAdmin } from '@/lib/requireAdmin';
import { getStoreSettings } from '@/lib/data';
import AdminPaymentSettingsClient from './AdminPaymentSettingsClient';

export const metadata = {
  title: 'Payment Settings | Admin',
};

export default async function PaymentMethodsPage() {
  await requireAdmin();
  const settings = await getStoreSettings();

  return <AdminPaymentSettingsClient initialSettings={settings} />;
}

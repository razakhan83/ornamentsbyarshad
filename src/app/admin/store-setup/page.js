// @ts-nocheck
import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';

import AdminStoreSetupClient from './AdminStoreSetupClient';

export default async function AdminStoreSetupPage() {
  await requireAdmin();
  const settings = await getAdminSettings();

  return <AdminStoreSetupClient initialSettings={settings} />;
}

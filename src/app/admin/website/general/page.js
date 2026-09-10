import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import AdminGeneralSettingsClient from './AdminGeneralSettingsClient';

export default async function GeneralSettingsPage() {
  await requireAdmin();
  const settings = await getAdminSettings();
  return <AdminGeneralSettingsClient initialSettings={settings} />;
}

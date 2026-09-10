import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import AdminSocialSettingsClient from './AdminSocialSettingsClient';

export default async function SocialSettingsPage() {
  await requireAdmin();
  const settings = await getAdminSettings();
  return <AdminSocialSettingsClient initialSettings={settings} />;
}

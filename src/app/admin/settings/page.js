// @ts-nocheck
import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import { isAdminEmail } from '@/lib/admin';

import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const isConfiguredAdmin = Boolean(session?.user?.email) && isAdminEmail(session.user.email);

  return <SettingsContent isConfiguredAdmin={isConfiguredAdmin} />;
}

async function SettingsContent({ isConfiguredAdmin }) {
  const settings = await getAdminSettings();
  return <AdminSettingsClient initialSettings={settings} isConfiguredAdmin={isConfiguredAdmin} />;
}

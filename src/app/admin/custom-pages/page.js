import { getAdminSettings } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';

import AdminCustomPagesClient from './AdminCustomPagesClient';

export default async function AdminCustomPagesPage() {
  await requireAdmin();

  const settings = await getAdminSettings();

  return <AdminCustomPagesClient initialPages={settings.customPages} />;
}

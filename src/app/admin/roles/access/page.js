import { requireAdmin } from '@/lib/requireAdmin';
import { isAdminEmail } from '@/lib/admin';
import { getStoreSettings } from '@/lib/data';
import AdminAccessSectionClient from './AdminAccessSectionClient';

export default async function AccessSettingsPage() {
  const session = await requireAdmin();
  const isConfiguredAdmin = Boolean(session?.user?.email) && isAdminEmail(session.user.email);
  const settings = await getStoreSettings();
  return (
    <AdminAccessSectionClient 
      isConfiguredAdmin={isConfiguredAdmin} 
      initialGuestMode={settings?.guestModeEnabled !== false}
    />
  );
}

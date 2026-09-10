import { requireAdmin } from '@/lib/requireAdmin';

import AdminVendorsSection from '../settings/AdminVendorsSection';

export const metadata = {
  title: 'Vendor Management | Admin',
};

export default async function AdminVendorsPage() {
  await requireAdmin();

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Vendor Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep vendor names and shop numbers under Products so the team can match items to market shops quickly.
        </p>
      </div>

      <AdminVendorsSection />
    </div>
  );
}

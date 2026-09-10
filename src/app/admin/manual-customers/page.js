import { requireAdmin } from '@/lib/requireAdmin';
import ManualCustomersClient from './ManualCustomersClient';

export const metadata = {
  title: 'Manual Customers - Admin',
};

export default async function ManualCustomersPage() {
  await requireAdmin();
  
  return (
    <div className="flex h-full w-full flex-col">
      <ManualCustomersClient />
    </div>
  );
}

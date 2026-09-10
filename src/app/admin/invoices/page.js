import { getInvoicesAction } from '@/app/actions/invoice.actions';
import AdminInvoicesClient from './AdminInvoicesClient';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'Invoices | China Unique Admin',
};

export default async function AdminInvoicesPage() {
  await requireAdmin();
  const initialData = await getInvoicesAction({ page: 1, limit: 20, search: '', status: 'ALL' });
  return <AdminInvoicesClient initialData={initialData} />;
}

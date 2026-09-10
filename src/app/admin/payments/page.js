import AdminPaymentsClient from './AdminPaymentsClient';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'Payments Received | China Unique Admin',
};

export default async function PaymentsPage() {
  await requireAdmin();
  return <AdminPaymentsClient />;
}

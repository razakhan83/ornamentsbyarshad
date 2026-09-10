import InvoiceFormClient from '../InvoiceFormClient';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'New Invoice | China Unique Admin',
};

export default async function NewInvoicePage() {
  await requireAdmin();
  return <InvoiceFormClient isEdit={false} />;
}

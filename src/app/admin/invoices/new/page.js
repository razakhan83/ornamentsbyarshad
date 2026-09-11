import InvoiceFormClient from '../InvoiceFormClient';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'New Invoice | Ornaments by Arshad Admin',
};

export default async function NewInvoicePage() {
  await requireAdmin();
  return <InvoiceFormClient isEdit={false} />;
}

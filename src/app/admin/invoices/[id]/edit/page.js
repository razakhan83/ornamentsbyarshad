import { getInvoiceByIdAction } from '@/app/actions/invoice.actions';
import InvoiceFormClient from '../../InvoiceFormClient';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';

export const metadata = {
  title: 'Edit Invoice | China Unique Admin',
};

export default async function EditInvoicePage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const invoice = await getInvoiceByIdAction(id);
  if (!invoice) notFound();

  return <InvoiceFormClient initialInvoice={invoice} isEdit={true} />;
}

import { getInvoiceByIdAction } from '@/app/actions/invoice.actions';
import InvoiceViewClient from './InvoiceViewClient';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/requireAdmin';

export async function generateMetadata({ params }) {
  await requireAdmin();
  const { id } = await params;
  const invoice = await getInvoiceByIdAction(id);
  if (!invoice) return { title: 'Invoice Not Found' };
  return { title: `Invoice ${invoice.invoiceNumber} | China Unique Admin` };
}

export default async function InvoiceDetailPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const invoice = await getInvoiceByIdAction(id);
  if (!invoice) notFound();

  return <InvoiceViewClient invoice={invoice} />;
}

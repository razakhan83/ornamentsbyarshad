import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import { getInvoiceByIdAction, updateInvoiceAction, deleteInvoiceAction } from '@/app/actions/invoice.actions';

export async function GET(request, { params }) {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const invoice = await getInvoiceByIdAction(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Admin invoices [id] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice details' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const result = await updateInvoiceAction(id, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin invoices [id] PUT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    const { id } = await params;
    const result = await deleteInvoiceAction(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin invoices [id] DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 500 });
  }
}

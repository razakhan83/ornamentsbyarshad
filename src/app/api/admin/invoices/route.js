import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import { getInvoicesAction, createInvoiceAction } from '@/app/actions/invoice.actions';

export async function GET(request) {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    const result = await getInvoicesAction({ page, limit, search, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin invoices GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    const body = await request.json();
    const result = await createInvoiceAction(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin invoices POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}

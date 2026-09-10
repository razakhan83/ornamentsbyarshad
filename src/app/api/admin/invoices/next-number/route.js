import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNextInvoiceNumberAction } from '@/app/actions/invoice.actions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nextNumber = await getNextInvoiceNumberAction();
    return NextResponse.json({ nextNumber });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to fetch next invoice number' }, { status: 500 });
  }
}

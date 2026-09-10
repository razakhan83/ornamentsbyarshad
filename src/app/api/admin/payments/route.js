import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Payment from '@/models/Payment';
import { recordPaymentAction } from '@/app/actions/invoice.actions';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const query = {};
    if (invoiceId) query.invoiceId = invoiceId;

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      payments: payments.map((p) => ({
        ...p,
        _id: p._id.toString(),
        invoiceId: p.invoiceId.toString(),
        paymentDate: p.paymentDate?.toISOString() || null,
        createdAt: p.createdAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Auth is handled inside recordPaymentAction via assertAdmin()
    const body = await request.json();
    const result = await recordPaymentAction(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
  }
}

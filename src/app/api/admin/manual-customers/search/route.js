import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import ManualCustomer from '@/models/ManualCustomer';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function GET(req) {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;
    await mongooseConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ customers: [] });
    }

    const regexQuery = new RegExp(query.trim(), 'i');

    const customers = await ManualCustomer.find({
      $or: [
        { name: regexQuery },
        { phone: regexQuery }
      ]
    })
      .select('name phone email address city')
      .limit(10)
      .lean();

    return NextResponse.json({ customers });
  } catch (error) {
    if (error?.digest?.startsWith('NEXT_') || error?.digest === 'HANGING_PROMISE_REJECTION') {
      throw error;
    }
    console.error('Manual customer search error:', error);
    return NextResponse.json(
      { error: 'Failed to search manual customers' },
      { status: 500 }
    );
  }
}

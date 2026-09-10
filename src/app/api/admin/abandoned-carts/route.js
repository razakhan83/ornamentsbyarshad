import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import AbandonedCart from '@/models/AbandonedCart';

export async function GET(req) {
  try {
    const auth = await requireApiAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    await mongooseConnect();

    const query = {};
    if (status !== 'all') {
      query.status = status.toUpperCase();
    }
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const carts = await AbandonedCart.find(query)
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(carts)),
    });
  } catch (error) {
    console.error('Failed to fetch abandoned carts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch abandoned carts' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;

    const { id, status } = await req.json();
    if (!id || !['ABANDONED', 'RECOVERED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    await mongooseConnect();
    const updated = await AbandonedCart.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    return NextResponse.json({ success: true, data: JSON.parse(JSON.stringify(updated)) });
  } catch (error) {
    console.error('Failed to update abandoned cart:', error);
    return NextResponse.json({ success: false, error: 'Failed to update abandoned cart' }, { status: 500 });
  }
}

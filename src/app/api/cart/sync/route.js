import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import AbandonedCart from '@/models/AbandonedCart';

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, name, email, city, address, landmark, items, totalAmount } = body;

    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      return NextResponse.json({ success: false, message: 'Valid phone is required' }, { status: 400 });
    }

    const cleanItems = (Array.isArray(items) ? items : []).map((item) => ({
      productId: String(item.slug || item.productId || item._id || item.id || '').trim(),
      name: String(item.name || item.Name || 'Item').trim(),
      price: Number(item.price || item.Price || 0),
      quantity: Math.max(1, Number(item.quantity || 1)),
      image: String(item.image || item.Images?.[0]?.url || '').trim(),
    })).filter((item) => item.productId);

    if (cleanItems.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart items required' }, { status: 400 });
    }

    await mongooseConnect();

    // Upsert the abandoned cart for this phone number if still in ABANDONED status
    await AbandonedCart.findOneAndUpdate(
      { phone: cleanPhone, status: 'ABANDONED' },
      {
        $set: {
          phone: cleanPhone,
          name: String(name || '').trim(),
          email: String(email || '').toLowerCase().trim(),
          city: String(city || '').trim(),
          address: String(address || '').trim(),
          landmark: String(landmark || '').trim(),
          items: cleanItems,
          totalAmount: Number(totalAmount || 0),
          lastActiveAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

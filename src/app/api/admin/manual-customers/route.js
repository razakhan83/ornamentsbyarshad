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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      const regexQuery = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regexQuery },
        { phone: regexQuery },
        { email: regexQuery }
      ];
    }

    const [items, total] = await Promise.all([
      ManualCustomer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ManualCustomer.countDocuments(query)
    ]);

    return NextResponse.json({
      items: JSON.parse(JSON.stringify(items)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch manual customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual customers' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;
    await mongooseConnect();

    const body = await req.json();
    const { name, phone, email, address, city } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const customer = await ManualCustomer.create({
      name,
      phone,
      email,
      address,
      city
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create manual customer error:', error);
    return NextResponse.json(
      { error: 'Failed to create manual customer' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import ManualCustomer from '@/models/ManualCustomer';
import { requireApiAdmin } from '@/lib/requireAdmin';

export async function PUT(req, { params }) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;
    await mongooseConnect();

    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, address, city } = body;

    const customer = await ManualCustomer.findByIdAndUpdate(
      id,
      { name, phone, email, address, city },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Update manual customer error:', error);
    return NextResponse.json(
      { error: 'Failed to update manual customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requireApiAdmin({ mutation: true });
    if (auth.error) return auth.error;
    await mongooseConnect();

    const { id } = await params;
    const customer = await ManualCustomer.findByIdAndDelete(id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete manual customer error:', error);
    return NextResponse.json(
      { error: 'Failed to delete manual customer' },
      { status: 500 }
    );
  }
}

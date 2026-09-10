import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Vendor from '@/models/Vendor';
import { serializeVendor } from '@/lib/vendors';

async function readJsonSafely(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
    }
    await mongooseConnect();

    const vendors = await Vendor.find({}).sort({ name: 1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: vendors.map(serializeVendor).filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
    }
    if (session?.user?.isDemo) {
      return NextResponse.json({ success: false, message: 'Demo Mode: Actions are disabled. You have read-only access.', error: 'Demo Mode: Actions are disabled. You have read-only access.' }, { status: 403 });
    }
    await mongooseConnect();

    const body = await readJsonSafely(request);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }
    const name = String(body?.name || '').trim();
    const shopNumber = String(body?.shopNumber || '').trim();
    const phone = String(body?.phone || '').trim();
    const whatsappNumber = String(body?.whatsappNumber || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const address = String(body?.address || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Vendor name is required.' }, { status: 400 });
    }

    const existingVendor = await Vendor.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
    if (existingVendor) {
      return NextResponse.json({ success: false, error: 'A vendor with this name already exists.' }, { status: 409 });
    }

    const vendor = await Vendor.create({ name, shopNumber, phone, whatsappNumber, email, address });

    revalidateTag('admin-dashboard');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');

    return NextResponse.json({
      success: true,
      data: serializeVendor(vendor.toObject()),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

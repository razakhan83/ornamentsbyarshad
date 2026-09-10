import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import { normalizeProductImages } from '@/lib/productImages';
import { normalizeVendorSnapshot } from '@/lib/vendors';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
    }

    await mongooseConnect();

    const search = String(request.nextUrl.searchParams.get('search') || '').trim();
    if (search.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const searchRegex = new RegExp(escapeRegex(search), 'i');
    const products = await Product.find({
      vendors: { $exists: true, $ne: [] },
      $or: [{ Name: searchRegex }, { 'vendors.name': searchRegex }, { 'vendors.vendorProductName': searchRegex }],
    })
      .select('Name slug StockStatus Images showOnStore vendors')
      .sort({ updatedAt: -1, Name: 1 })
      .limit(25)
      .lean();

    return NextResponse.json({
      success: true,
      data: products.map((product) => ({
        _id: product._id.toString(),
        slug: product.slug || product._id.toString(),
        Name: product.Name,
        StockStatus: product.StockStatus || 'Out of Stock',
        showOnStore: product.showOnStore !== false,
        Images: normalizeProductImages(product.Images),
        vendors: Array.isArray(product.vendors)
          ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
          : [],
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

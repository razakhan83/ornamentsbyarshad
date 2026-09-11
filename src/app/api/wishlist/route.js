import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import { normalizeEmail } from '@/lib/admin';

function serializeWishlistProduct(product) {
  return {
    _id: product._id.toString(),
    id: product.slug || product._id.toString(),
    slug: product.slug || product._id.toString(),
    Name: product.Name || '',
    Price: Number(product.Price || 0),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    Images: Array.isArray(product.Images) ? product.Images : [],
    Category: Array.isArray(product.Category) ? product.Category : product.Category ? [product.Category] : [],
    StockStatus: product.StockStatus || 'Out of Stock',
    stockQuantity: Math.max(0, Number(product.stockQuantity) || 0),
    showOnStore: product.showOnStore !== false,
  };
}

async function getWishlistPayload(email) {
  await mongooseConnect();

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('wishlist').lean();
  const wishlistIds = Array.isArray(user?.wishlist) ? user.wishlist.map((id) => String(id)) : [];

  if (wishlistIds.length === 0) {
    return { ids: [], items: [] };
  }

  const products = await Product.find({
    _id: { $in: wishlistIds },
    showOnStore: true,
  })
    .select('Name Price compareAtPrice Images slug StockStatus stockQuantity')
    .lean();

  const productMap = new Map(products.map((product) => [product._id.toString(), serializeWishlistProduct(product)]));
  const items = wishlistIds.map((id) => productMap.get(id)).filter(Boolean);

  return {
    ids: items.map((item) => item._id),
    items,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getWishlistPayload(session.user.email);
  return NextResponse.json({ success: true, data });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await request.json();
  const safeProductId = String(productId || '').trim();
  if (!safeProductId) {
    return NextResponse.json({ success: false, error: 'Product is required' }, { status: 400 });
  }

  await mongooseConnect();
  await User.findOneAndUpdate(
    { email: normalizeEmail(session.user.email) },
    { $addToSet: { wishlist: safeProductId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const data = await getWishlistPayload(session.user.email);
  return NextResponse.json({ success: true, data });
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { productIds } = await request.json();
  const safeIds = Array.isArray(productIds)
    ? productIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  await mongooseConnect();
  if (safeIds.length > 0) {
    await User.findOneAndUpdate(
      { email: normalizeEmail(session.user.email) },
      { $addToSet: { wishlist: { $each: safeIds } } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const data = await getWishlistPayload(session.user.email);
  return NextResponse.json({ success: true, data });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { productId } = await request.json();
  const safeProductId = String(productId || '').trim();
  if (!safeProductId) {
    return NextResponse.json({ success: false, error: 'Product is required' }, { status: 400 });
  }

  await mongooseConnect();
  await User.findOneAndUpdate(
    { email: normalizeEmail(session.user.email) },
    { $pull: { wishlist: safeProductId } },
    { new: true },
  );

  const data = await getWishlistPayload(session.user.email);
  return NextResponse.json({ success: true, data });
}

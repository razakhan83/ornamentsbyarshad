import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';
import { normalizeProductImages } from '@/lib/productImages';
import { normalizeVendorSnapshot } from '@/lib/vendors';

async function readJsonSafely(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function buildVendorEntry(normalizedVendors, activeVendor, id) {
  return (
    normalizedVendors.find((vendor) => String(vendor.vendorId || '') === String(id)) ||
    normalizedVendors.find(
      (vendor) =>
        String(vendor.name || '').trim().toLowerCase() === String(activeVendor.name || '').trim().toLowerCase() &&
        String(vendor.shopNumber || '').trim() === String(activeVendor.shopNumber || '').trim()
    ) ||
    normalizedVendors.find(
      (vendor) =>
        String(vendor.name || '').trim().toLowerCase() === String(activeVendor.name || '').trim().toLowerCase()
    ) ||
    null
  );
}

function serializeProduct(product, activeVendor, vendorId) {
  const normalizedVendors = Array.isArray(product.vendors)
    ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
    : [];

  return {
    _id: product._id.toString(),
    id: product.slug || product._id.toString(),
    slug: product.slug || product._id.toString(),
    Name: product.Name,
    StockStatus: product.StockStatus || 'Out of Stock',
    showOnStore: product.showOnStore !== false,
    Images: normalizeProductImages(product.Images),
    vendors: normalizedVendors,
    vendorEntry: buildVendorEntry(normalizedVendors, activeVendor, vendorId),
  };
}

async function requireAdminSession(allowDemo = false) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
  }
  if (!allowDemo && session.user?.isDemo) {
    return NextResponse.json({ success: false, error: 'Demo Mode: Actions are disabled.' }, { status: 403 });
  }

  return null;
}

export async function GET(request, { params }) {
  try {
    const authError = await requireAdminSession(true);
    if (authError) return authError;
    await mongooseConnect();

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const mode = String(searchParams.get('mode') || '').trim().toLowerCase();
    const search = String(searchParams.get('search') || '').trim();
    const activeVendor = await Vendor.findById(id).lean();
    if (!activeVendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }

    if (mode === 'available') {
      if (!search) {
        return NextResponse.json({ success: true, data: [] });
      }

      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const products = await Product.find({
        showOnStore: true,
        Name: searchRegex,
      })
        .select('Name slug StockStatus Images showOnStore vendors')
        .sort({ updatedAt: -1, Name: 1 })
        .limit(20)
        .lean();

      return NextResponse.json({
        success: true,
        data: products.map((product) => {
          const serialized = serializeProduct(product, activeVendor, id);
          return {
            ...serialized,
            alreadyLinked: Boolean(serialized.vendorEntry),
          };
        }),
      });
    }

    const products = await Product.find({ 'vendors.vendorId': id })
      .select('Name slug StockStatus Images showOnStore vendors')
      .sort({ Name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: products.map((product) => serializeProduct(product, activeVendor, id)),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;
    await mongooseConnect();

    const { id } = await params;
    const activeVendor = await Vendor.findById(id);
    if (!activeVendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }

    const body = await readJsonSafely(request);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }
    const productId = String(body?.productId || '').trim();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product is required.' }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    const normalizedVendors = Array.isArray(product.vendors)
      ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
      : [];

    const nextVendorEntry = {
      vendorId: activeVendor._id,
      name: activeVendor.name,
      shopNumber: activeVendor.shopNumber || '',
      phone: activeVendor.phone || '',
      whatsappNumber: activeVendor.whatsappNumber || '',
      email: activeVendor.email || '',
      address: activeVendor.address || '',
      vendorProductName: String(body?.vendorProductName || '').trim(),
      vendorPrice:
        body?.vendorPrice === '' || body?.vendorPrice === null || body?.vendorPrice === undefined
          ? null
          : Math.max(0, Number(body.vendorPrice) || 0),
    };

    const existingIndex = normalizedVendors.findIndex(
      (vendor) => String(vendor.vendorId || '') === String(activeVendor._id)
    );

    if (existingIndex >= 0) {
      normalizedVendors[existingIndex] = nextVendorEntry;
    } else {
      normalizedVendors.push(nextVendorEntry);
    }

    product.vendors = normalizedVendors;
    await product.save();

    return NextResponse.json({
      success: true,
      data: serializeProduct(product.toObject(), activeVendor.toObject(), id),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authError = await requireAdminSession();
    if (authError) return authError;
    await mongooseConnect();

    const { id } = await params;
    const activeVendor = await Vendor.findById(id);
    if (!activeVendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found.' }, { status: 404 });
    }

    const body = await readJsonSafely(request);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }
    const productId = String(body?.productId || '').trim();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product is required.' }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    const normalizedVendors = Array.isArray(product.vendors)
      ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
      : [];

    product.vendors = normalizedVendors.filter(
      (vendor) => String(vendor.vendorId || '') !== String(activeVendor._id)
    );
    await product.save();

    return NextResponse.json({
      success: true,
      data: serializeProduct(product.toObject(), activeVendor.toObject(), id),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

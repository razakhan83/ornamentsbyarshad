import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import { requireApiAdmin } from '@/lib/requireAdmin';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    await mongooseConnect();

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const limit = Math.min(80, Math.max(1, Number(searchParams.get('limit')) || 40));

    const query = {};
    if (q) {
      const safe = escapeRegex(q);
      query.$or = [
        { Name: { $regex: safe, $options: 'i' } },
        { slug: { $regex: safe, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .select('Name Price discountedPrice isDiscounted Images slug Category StockStatus isFeatured featuredPriority discountPercentage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        _id: String(p._id),
        Name: p.Name || '',
        Price: Number(p.Price || 0),
        discountedPrice: p.discountedPrice != null ? Number(p.discountedPrice) : null,
        isDiscounted: p.isDiscounted === true,
        discountPercentage: Number(p.discountPercentage || 0),
        StockStatus: p.StockStatus || 'In Stock',
        Images: p.Images || [],
        slug: p.slug || '',
        isFeatured: p.isFeatured === true,
        featuredPriority: Number(p.featuredPriority || 0),
      })),
    });
  } catch (error) {
    console.error('Admin catalog error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load catalog' }, { status: 500 });
  }
}

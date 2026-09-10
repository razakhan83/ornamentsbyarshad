import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = String(searchParams.get('q') || '').trim();

    const category = await Category.findById(id).lean();
    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const filter = {
      Category: category._id,
    };

    if (search) {
      filter.Name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter)
      .select('Name Price discountedPrice isDiscounted Images StockStatus stockQuantity showOnStore isFeatured createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formattedProducts = products.map((p) => {
      const firstImage = Array.isArray(p.Images) && p.Images.length > 0 ? p.Images[0] : null;
      const imageUrl = firstImage?.url || firstImage?.secure_url || (typeof firstImage === 'string' ? firstImage : '');

      return {
        _id: p._id.toString(),
        name: p.Name || 'Untitled Product',
        price: p.Price || 0,
        discountedPrice: p.discountedPrice || null,
        isDiscounted: Boolean(p.isDiscounted),
        image: optimizeCloudinaryUrl(imageUrl),
        stockStatus: p.StockStatus || (p.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'),
        stockQuantity: p.stockQuantity ?? 0,
        showOnStore: p.showOnStore !== false,
        isFeatured: Boolean(p.isFeatured),
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      category: {
        _id: category._id.toString(),
        name: category.name,
        storefrontProductLimit: category.storefrontProductLimit ?? 8,
        featuredProductIds: Array.isArray(category.featuredProductIds)
          ? category.featuredProductIds.map((pid) => (pid?._id ? pid._id.toString() : pid.toString())).filter(Boolean)
          : [],
        showcaseSelectionMode: category.showcaseSelectionMode || 'pinned_first',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

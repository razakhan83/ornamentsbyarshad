import { NextResponse } from 'next/server';
import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { getProductCategories } from '@/lib/productCategories';
import { normalizeProductImages } from '@/lib/productImages';

export async function GET(req) {
    try {
        await mongooseConnect();

        const { searchParams } = new URL(req.url);
        const query = String(searchParams.get('q') || '').trim();
        const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit')) || 5));
        const suggest = searchParams.get('suggest') === '1';

        if (suggest || !query) {
            const [categories, trending] = await Promise.all([
                Category.find({}, 'name slug').sort({ sortOrder: 1, name: 1 }).limit(8).lean(),
                Product.find(
                    { showOnStore: { $ne: false }, isBestSelling: true },
                    'Name slug _id'
                )
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .lean(),
            ]);

            const trendingFallback = trending.length
                ? trending
                : await Product.find({ showOnStore: { $ne: false } }, 'Name slug _id')
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .lean();

            return NextResponse.json({
                success: true,
                data: [],
                categories: categories.map((category) => ({
                    id: category._id.toString(),
                    slug: category.slug || category.name,
                    label: category.name,
                    name: category.name,
                })),
                trending: trendingFallback.map((product) => ({
                    ...product,
                    _id: product._id.toString(),
                    id: product.slug || product._id.toString(),
                })),
            });
        }

        const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const matchingCategories = await Category.find(
            {
                $or: [
                    { name: searchRegex },
                    { slug: searchRegex },
                ],
            },
            '_id'
        ).lean();

        const categoryIds = matchingCategories.map((category) => category._id);

        const products = await Product.find(
            {
                showOnStore: { $ne: false },
                $or: [
                    { Name: searchRegex },
                    ...(categoryIds.length ? [{ Category: { $in: categoryIds } }] : []),
                ],
            },
            'Name Category Images slug _id Price price isDiscounted discountPercentage discountedPrice compareAtPrice isBestSelling reviewCount averageRating StockStatus showOnStore'
        )
        .populate({ path: 'Category', select: 'name slug' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

        // Format objectId to string securely
        const safeProducts = products.map(p => ({
            ...p,
            _id: p._id.toString(),
            id: p.slug || p._id.toString(),
            Category: getProductCategories(p),
            Images: normalizeProductImages(p.Images),
        }));

        return NextResponse.json({ success: true, data: safeProducts });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch search products' }, { status: 500 });
    }
}

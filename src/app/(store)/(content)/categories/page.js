import { cacheLife, cacheTag } from 'next/cache';
import mongooseConnect from '@/lib/mongooseConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import CategoriesClientPage from './CategoriesClientPage';

export const metadata = {
  title: 'Luxury Collections | Ornaments by Arshad',
  description: 'Explore fine jewelry collections at Ornaments by Arshad. Browse handcrafted bridal sets, necklace sets, diamond rings, bracelets, and heirloom earrings.',
};

async function getCategoriesData() {
  try {
    await mongooseConnect();

    const categories = await Category.find({ isEnabled: true, slug: { $ne: 'special-offers' } })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Get count of active products for each category
    const counts = await Product.aggregate([
      { $unwind: "$Category" },
      {
        $group: {
          _id: "$Category",
          productCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), Number(c.productCount || 0)]));

    return categories.map((cat, idx) => ({
      _id: cat._id.toString(),
      id: cat.slug || cat._id.toString(),
      name: cat.name,
      slug: cat.slug,
      image: cat.image || '',
      secondaryImage: cat.secondaryImage || '',
      tertiaryImage: cat.tertiaryImage || '',
      blurDataURL: cat.blurDataURL || '',
      secondaryBlurDataURL: cat.secondaryBlurDataURL || '',
      tertiaryBlurDataURL: cat.tertiaryBlurDataURL || '',
      productCount: countMap.get(String(cat._id)) || 0,
      index: idx,
    }));
  } catch (error) {
    console.error('Failed to load categories page data:', error);
    return [];
  }
}

export default async function CategoriesPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('categories');

  const categories = await getCategoriesData();

  return <CategoriesClientPage initialCategories={categories} />;
}

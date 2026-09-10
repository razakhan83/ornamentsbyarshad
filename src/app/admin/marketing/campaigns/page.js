import { requireAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import { normalizeProductImages } from '@/lib/productImages';
import CampaignsClient from './CampaignsClient';

export const metadata = {
  title: 'Special Offers & Campaigns | Admin',
};

export default async function DiscountCampaignsPage() {
  await requireAdmin();
  await mongooseConnect();

  const discountedProducts = await Product.find({
      showOnStore: true,
      $or: [{ isDiscounted: true }, { discountPercentage: { $gt: 0 } }],
    })
      .select('Name Price discountPercentage isDiscounted discountedPrice Images slug StockStatus')
      .sort({ discountPercentage: -1, updatedAt: -1 })
      .lean();

  const serialize = (p) => ({
    _id: p._id.toString(),
    id: p.slug || p._id.toString(),
    Name: p.Name || '',
    Price: Number(p.Price || 0),
    discountPercentage: Number(p.discountPercentage || 0),
    isDiscounted: p.isDiscounted === true || Number(p.discountPercentage || 0) > 0,
    StockStatus: p.StockStatus || 'In Stock',
    Images: normalizeProductImages(p.Images),
    slug: p.slug || p._id.toString(),
  });

  return (
    <CampaignsClient
      initialDiscounted={discountedProducts.map(serialize)}
    />
  );
}

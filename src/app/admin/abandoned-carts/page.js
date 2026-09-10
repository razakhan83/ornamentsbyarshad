import { requireAdmin } from '@/lib/requireAdmin';
import mongooseConnect from '@/lib/mongooseConnect';
import AbandonedCart from '@/models/AbandonedCart';
import AbandonedCartsClient from './AbandonedCartsClient';

export default async function AdminAbandonedCartsPage() {
  await requireAdmin();
  await mongooseConnect();

  const carts = await AbandonedCart.find()
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  return (
    <AbandonedCartsClient
      initialCarts={JSON.parse(JSON.stringify(carts || []))}
    />
  );
}

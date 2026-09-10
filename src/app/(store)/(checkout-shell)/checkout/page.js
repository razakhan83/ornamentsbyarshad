import { cacheLife, cacheTag } from 'next/cache';
import { getStoreSettings, getProductsList } from '@/lib/data';
import CheckoutClient from './CheckoutClient';

export const metadata = {
  title: 'Checkout',
  description: 'Complete your luxury jewelry order at Ornaments by Arshad.',
};

export default async function CheckoutPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('settings', 'products');

  const [settings, productsData] = await Promise.all([
    getStoreSettings(),
    getProductsList({ limit: 12 }),
  ]);
  const relatedProducts = (productsData?.items || []).filter(
    (p) => p.StockStatus === 'In Stock' && p.showOnStore !== false
  );

  return (
    <div id="checkout-root" className="min-h-screen bg-background pb-24 md:pb-0">
      <CheckoutClient settings={settings} relatedProducts={relatedProducts} />
    </div>
  );
}

import { cacheLife, cacheTag } from 'next/cache';
import StoreCustomPage from '@/components/StoreCustomPage';
import { getStoreCustomPageBySlug, getStoreSettings } from '@/lib/data';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/siteSeo';

export async function generateMetadata() {
  const page = await getStoreCustomPageBySlug('privacy-policy');

  return pageMetadata({
    title: page?.seoTitle || page?.title || 'Privacy Policy',
    description: page?.seoDescription || page?.description || '',
  });
}

export default async function PrivacyPolicyPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('custom-pages', 'settings');

  const [page, settings] = await Promise.all([
    getStoreCustomPageBySlug('privacy-policy'),
    getStoreSettings(),
  ]);

  if (!page || page.isEnabled === false) {
    notFound();
  }

  return <StoreCustomPage page={page} storeName={settings?.storeName || 'Ornaments by Arshad'} />;
}

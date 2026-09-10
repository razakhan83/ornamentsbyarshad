import { cacheLife, cacheTag } from 'next/cache';
import StoreCustomPage from '@/components/StoreCustomPage';
import { getStoreCustomPageBySlug, getStoreSettings } from '@/lib/data';
import { DEFAULT_CUSTOM_PAGES, getCustomPageBySlug } from '@/lib/customPages';
import { pageMetadata } from '@/lib/siteSeo';

export async function generateMetadata() {
  try {
    const page = await getStoreCustomPageBySlug('about-us');
    return pageMetadata({
      title: page?.seoTitle || page?.title || 'About Us',
      description: page?.seoDescription || page?.description || '',
    });
  } catch {
    const fallbackPage = getCustomPageBySlug(DEFAULT_CUSTOM_PAGES, 'about-us');
    return pageMetadata({
      title: fallbackPage?.seoTitle || 'About Us',
      description: fallbackPage?.seoDescription || '',
    });
  }
}

export default async function AboutUsPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('custom-pages', 'settings');

  try {
    const [page, settings] = await Promise.all([
      getStoreCustomPageBySlug('about-us'),
      getStoreSettings(),
    ]);

    const finalPage = page || getCustomPageBySlug(DEFAULT_CUSTOM_PAGES, 'about-us');
    return <StoreCustomPage page={finalPage} storeName={settings?.storeName || 'Ornaments by Arshad'} />;
  } catch {
    const fallbackPage = getCustomPageBySlug(DEFAULT_CUSTOM_PAGES, 'about-us');
    return <StoreCustomPage page={fallbackPage} storeName="Ornaments by Arshad" />;
  }
}

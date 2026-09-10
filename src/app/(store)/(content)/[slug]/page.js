import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import StoreCustomPage from '@/components/StoreCustomPage';
import { getStoreCustomPageBySlug, getStoreSettings } from '@/lib/data';
import { pageMetadata } from '@/lib/siteSeo';

export async function generateStaticParams() {
  const settings = await getStoreSettings();
  const pages = settings?.customPages || [];
  return pages.map((page) => ({ slug: page.slug })).filter((p) => Boolean(p.slug));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const page = await getStoreCustomPageBySlug(resolvedParams?.slug);

  if (!page || page.isEnabled === false) {
    return {};
  }

  return pageMetadata({
    title: page.seoTitle || page.title || 'Store Page',
    description: page.seoDescription || page.description || '',
  });
}

export default async function DynamicCustomPage({ params }) {
  'use cache';
  cacheLife('foreverish');
  cacheTag('custom-pages', 'settings');

  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  const [page, settings] = await Promise.all([
    getStoreCustomPageBySlug(slug),
    getStoreSettings(),
  ]);

  if (!page || page.isEnabled === false) {
    notFound();
  }

  return <StoreCustomPage page={page} storeName={settings.storeName} />;
}

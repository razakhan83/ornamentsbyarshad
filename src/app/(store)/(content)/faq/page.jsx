import { cacheLife, cacheTag } from 'next/cache';
import { getStoreCustomPageBySlug, getStoreSettings } from '@/lib/data';
import { notFound } from 'next/navigation';
import FaqPageClient from './FaqPageClient';
import { pageMetadata } from '@/lib/siteSeo';

export async function generateMetadata() {
  const page = await getStoreCustomPageBySlug('faq');

  return pageMetadata({
    title: page?.seoTitle || page?.title || 'Frequently Asked Questions',
    description: page?.seoDescription || 'Find quick answers about shipping, delivery times, cash on delivery, returns, and product usage.',
  });
}

export default async function FaqPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('custom-pages', 'settings');

  const [page, settings] = await Promise.all([
    getStoreCustomPageBySlug('faq'),
    getStoreSettings(),
  ]);

  if (!page || page.isEnabled === false) {
    notFound();
  }

  return (
    <FaqPageClient
      whatsappNumber={settings.whatsappNumber}
      storeName={settings.storeName}
      pageTitle={page.title}
      pageDescription={page.description}
    />
  );
}

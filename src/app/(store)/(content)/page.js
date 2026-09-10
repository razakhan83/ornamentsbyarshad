import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';
import HomeSectionRenderer from '@/components/home/HomeSectionRenderer';
import HomeBelowFold from '@/components/home/HomeBelowFold';
import { getStorefrontHomePage } from '@/lib/data';
import { SITE_DESCRIPTION, SITE_TITLE_DEFAULT } from '@/lib/siteSeo';

export const metadata = {
  title: {
    absolute: SITE_TITLE_DEFAULT,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('home-page', 'settings', 'products');

  const homeData = await getStorefrontHomePage().catch(() => ({ sections: [] }));
  const sections = homeData?.sections || [];

  return (
    <>
      <HomeSectionRenderer sections={sections} />
      <Suspense fallback={<div className="h-48 w-full bg-background" aria-hidden="true" />}>
        <HomeBelowFold />
      </Suspense>
    </>
  );
}

import { getCatalogFeed } from '@/lib/data';

export async function GET(request) {
  const feed = await getCatalogFeed(request.nextUrl.origin);

  return Response.json(feed, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

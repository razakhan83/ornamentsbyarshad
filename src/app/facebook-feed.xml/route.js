import { getCatalogFeed } from '@/lib/data';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderFeedItem(item) {
  const additionalImages = item.additionalImageLinks
    .map((url) => `\n      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`)
    .join('');

  return `  <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>${additionalImages}
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:price>${escapeXml(item.price)}</g:price>${item.salePrice ? `\n      <g:sale_price>${escapeXml(item.salePrice)}</g:sale_price>` : ''}
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:product_type>${escapeXml(item.productType)}</g:product_type>
    </item>`;
}

export async function GET(request) {
  const feed = await getCatalogFeed(request.nextUrl.origin);
  const siteUrl = request.nextUrl.origin;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(feed.storeName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(`${feed.storeName} product catalog feed`)}</description>
${feed.items.map(renderFeedItem).join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

import { getCatalogFeed } from '@/lib/data';

export async function GET(request) {
  const feed = await getCatalogFeed(request.nextUrl.origin);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title><![CDATA[${feed.storeName}]]></title>
    <link>${request.nextUrl.origin}</link>
    <description><![CDATA[Product Catalog for ${feed.storeName}]]></description>
    ${feed.items.map(item => `
    <item>
      <g:id><![CDATA[${item.id}]]></g:id>
      <g:title><![CDATA[${item.title}]]></g:title>
      <g:description><![CDATA[${item.description}]]></g:description>
      <g:link><![CDATA[${item.link}]]></g:link>
      <g:image_link><![CDATA[${item.imageLink}]]></g:image_link>
      ${(item.additionalImageLinks || []).map(img => `<g:additional_image_link><![CDATA[${img}]]></g:additional_image_link>`).join('\n      ')}
      <g:brand><![CDATA[${item.brand || feed.storeName}]]></g:brand>
      <g:condition><![CDATA[${item.condition || 'new'}]]></g:condition>
      <g:availability><![CDATA[${item.availability || 'in stock'}]]></g:availability>
      <g:price><![CDATA[${item.price}]]></g:price>
      ${item.salePrice ? `<g:sale_price><![CDATA[${item.salePrice}]]></g:sale_price>` : ''}
      ${item.productType ? `<g:product_type><![CDATA[${item.productType}]]></g:product_type>` : ''}
    </item>`).join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

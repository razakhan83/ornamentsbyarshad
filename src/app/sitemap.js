import mongooseConnect from '@/lib/mongooseConnect';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { getSiteUrl } from '@/lib/siteUrl';

export default async function sitemap() {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteUrl() || 'https://www.ornamentsbyarshad.com';
  const baseUrl = String(rawBaseUrl).trim().replace(/\/$/, '');

  // Static core routes
  const staticRoutes = [
    '',
    '/products',
    '/categories',
    '/about-us',
    '/contact-us',
    '/faq',
    '/shipping-policy',
    '/refund-policy',
    '/privacy-policy',
    '/terms-of-service',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  try {
    await mongooseConnect();

    // Dynamic store product URLs
    const products = await Product.find({ showOnStore: true })
      .select('slug updatedAt')
      .lean();

    const productRoutes = (products || []).map((product) => ({
      url: `${baseUrl}/products/${product.slug || product._id}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }));

    // Dynamic store category URLs
    const categories = await Category.find({})
      .select('slug name updatedAt')
      .lean();

    const categoryRoutes = (categories || []).map((cat) => ({
      url: `${baseUrl}/products?category=${encodeURIComponent(cat.slug || cat.name)}`,
      lastModified: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticRoutes;
  }
}

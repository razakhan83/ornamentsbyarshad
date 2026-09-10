'use server';

import { getProductsList } from '@/lib/data';

/**
 * Fetch a subsequent chunk of products for infinite scroll.
 * Runs on server, benefits from Next.js 16 cache tags, returns plain serializable JSON.
 */
export async function fetchMoreProductsAction({
  category = 'all',
  search = '',
  sort = 'newest',
  price = 'all',
  page = 2,
  limit = 20,
} = {}) {
  try {
    const result = await getProductsList({
      category,
      search,
      sort,
      price,
      page: Math.max(1, Number(page) || 1),
      limit: Math.max(1, Math.min(48, Number(limit) || 20)),
    });

    return {
      success: true,
      items: JSON.parse(JSON.stringify(result.items || [])),
      total: result.total || 0,
      hasMore: Boolean(result.hasMore),
      page: result.page || page,
    };
  } catch (error) {
    console.error('fetchMoreProductsAction error:', error);
    return {
      success: false,
      items: [],
      total: 0,
      hasMore: false,
      page,
      error: error?.message || 'Failed to load products',
    };
  }
}

/**
 * Helper to get a realistic, natural review count for products.
 * If the admin sets a custom review count on the product (customReviewCount), it is used.
 * Otherwise, generates a deterministic count between 2 and 20 based on product ID/slug.
 */
export function getProductReviewCount(product) {
  if (!product) return 5;

  if (typeof product.customReviewCount === 'number' && product.customReviewCount >= 0) {
    return product.customReviewCount;
  }

  if (typeof product.reviewsCount === 'number' && product.reviewsCount > 0 && product.reviewsCount !== 30 && product.reviewsCount !== 40) {
    return product.reviewsCount;
  }

  // Generate deterministic count between 2 and 20 based on product identifier
  const key = String(product._id || product.id || product.slug || product.Name || 'ornaments');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  const min = 2;
  const max = 20;
  const count = Math.abs(hash % (max - min + 1)) + min;
  return count;
}

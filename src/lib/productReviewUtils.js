function hashIdentifier(value) {
  const key = String(value || 'ornaments');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function productSeedKey(product) {
  return product?._id || product?.id || product?.slug || product?.Name || 'ornaments';
}

/** Stable 4.2–4.9 when a product has no stored rating. */
export function seedProductRating(productOrId) {
  const key = typeof productOrId === 'object' && productOrId !== null
    ? productSeedKey(productOrId)
    : productOrId;
  const tenths = hashIdentifier(key) % 8;
  return Math.round((4.2 + tenths * 0.1) * 10) / 10;
}

export function generateNewProductRating() {
  const tenths = Math.floor(Math.random() * 8);
  return Math.round((4.2 + tenths * 0.1) * 10) / 10;
}

export function normalizeProductRating(value, fallbackProduct) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(5, Math.max(1, Math.round(parsed * 10) / 10));
  }
  return seedProductRating(fallbackProduct);
}

export function getProductRating(product) {
  if (!product) return 4.5;
  return normalizeProductRating(product.rating, product);
}

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

  const min = 2;
  const max = 20;
  return (hashIdentifier(productSeedKey(product)) % (max - min + 1)) + min;
}

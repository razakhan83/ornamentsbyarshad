/** Unit price is always the catalog Price. compareAtPrice is display-only. */
export function getProductUnitPrice(product) {
  return Math.max(0, Number(product?.Price ?? product?.price ?? 0) || 0);
}

export function getVisibleCompareAtPrice(product, sellingPrice = getProductUnitPrice(product)) {
  const compareAtPrice = Number(product?.compareAtPrice ?? 0);
  return compareAtPrice > sellingPrice ? compareAtPrice : null;
}

export function getCompareAtOffPercent(product, sellingPrice = getProductUnitPrice(product)) {
  const compareAtPrice = getVisibleCompareAtPrice(product, sellingPrice);
  if (!compareAtPrice) return 0;
  return Math.max(1, Math.round(((compareAtPrice - sellingPrice) / compareAtPrice) * 100));
}

export function compareAtPriceFromPercentOff(price, percentOff) {
  const unit = Math.max(0, Number(price) || 0);
  const pct = Math.min(99, Math.max(0, Number(percentOff) || 0));
  if (unit <= 0 || pct <= 0) return null;
  return Math.round(unit / (1 - pct / 100));
}

export function getAvailableStock(product) {
  if (!product || product.showOnStore === false) return 0;
  const quantity = Math.max(0, Number(product.stockQuantity) || 0);
  if (quantity <= 0) return 0;
  if (product.StockStatus === 'Out of Stock') return 0;
  return quantity;
}

export function isProductOutOfStock(product) {
  return getAvailableStock(product) <= 0;
}

export function resolveStockStatus(stockQuantity, explicitStatus) {
  const quantity = Math.max(0, Number(stockQuantity) || 0);
  if (quantity <= 0) return 'Out of Stock';
  if (explicitStatus === 'Out of Stock') return 'Out of Stock';
  return 'In Stock';
}

export const COMPARE_AT_SALE_FILTER = {
  $expr: {
    $and: [
      { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, 0] },
      { $gt: ['$compareAtPrice', '$Price'] },
    ],
  },
};

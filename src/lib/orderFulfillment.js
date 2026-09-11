import mongoose from 'mongoose';

import Product from '@/models/Product';
import mongooseConnect from '@/lib/mongooseConnect';
import { normalizeProductImages } from '@/lib/productImages';
import { getAvailableStock, getProductUnitPrice, isProductOutOfStock } from '@/lib/productCommerce';

function toCleanId(value = '') {
  return String(value || '').trim();
}

function toCleanString(value = '') {
  return String(value || '').trim();
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildProductLookupMap(products = []) {
  const productMap = new Map();

  for (const product of products) {
    productMap.set(product._id.toString(), product);
    if (product.slug) {
      productMap.set(toCleanString(product.slug), product);
    }
  }

  return productMap;
}

export async function buildOrderItemsWithSourcing(items = []) {
  await mongooseConnect();

  const requestedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: toCleanId(item.slug || item.productId || item._id || item.id),
      quantity: Math.max(1, toSafeNumber(item.quantity, 1)),
      name: toCleanString(item.name || ''),
      price: toSafeNumber(item.price, 0),
      image: toCleanString(item.image || ''),
    }))
    .filter((item) => item.productId);

  if (requestedItems.length === 0) {
    return [];
  }

  const customItems = [];
  const dbItems = [];

  requestedItems.forEach((item) => {
    if (item.productId.startsWith('custom-') || item.productId.startsWith('unknown-')) {
      customItems.push({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        sourcingVendors: [],
      });
    } else {
      dbItems.push(item);
    }
  });

  const productIdentifiers = Array.from(new Set(dbItems.map((item) => item.productId)));
  const objectIds = productIdentifiers.filter((value) => mongoose.Types.ObjectId.isValid(value));
  const products = await Product.find({
    $or: [
      { slug: { $in: productIdentifiers } },
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
    ],
  })
    .select('slug Name Price Images stockQuantity StockStatus showOnStore')
    .lean();
  const productMap = buildProductLookupMap(products);

  const missingProductIds = dbItems
    .map((item) => item.productId)
    .filter((productId) => !productMap.has(productId));
  if (missingProductIds.length > 0) {
    throw new Error(`Some checkout items are no longer available: ${missingProductIds.join(', ')}`);
  }

  const resolvedDbItems = dbItems.map((item) => {
    const product = productMap.get(item.productId);
    if (isProductOutOfStock(product)) {
      throw new Error(`${product.Name} is out of stock.`);
    }

    const available = getAvailableStock(product);
    if (item.quantity > available) {
      throw new Error(`${product.Name} only has ${available} in stock.`);
    }

    const images = normalizeProductImages(product.Images);

    return {
      productId: item.productId,
      name: toCleanString(product.Name),
      price: getProductUnitPrice(product),
      quantity: item.quantity,
      image: toCleanString(images[0]?.url),
      sourcingVendors: [],
    };
  });

  return [...resolvedDbItems, ...customItems];
}

export function calculateOrderTotal(orderItems = []) {
  return (Array.isArray(orderItems) ? orderItems : []).reduce(
    (sum, item) => sum + Math.max(0, toSafeNumber(item.price)) * Math.max(1, toSafeNumber(item.quantity, 1)),
    0
  );
}

export async function applyInventoryAdjustments(orderItems = []) {
  await mongooseConnect();

  const requestedAdjustments = new Map();
  for (const item of Array.isArray(orderItems) ? orderItems : []) {
    const productId = toCleanId(item.productId);
    if (!mongoose.Types.ObjectId.isValid(productId)) continue;
    requestedAdjustments.set(
      productId,
      (requestedAdjustments.get(productId) || 0) + Math.max(1, toSafeNumber(item.quantity, 1))
    );
  }

  if (requestedAdjustments.size === 0) {
    return [];
  }

  const operations = Array.from(requestedAdjustments.entries()).map(([productId, orderedQuantity]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(productId) },
      update: [
        {
          $set: {
            stockQuantity: {
              $max: [
                0,
                {
                  $subtract: [{ $ifNull: ['$stockQuantity', 0] }, orderedQuantity],
                },
              ],
            },
          },
        },
        {
          $set: {
            StockStatus: {
              $cond: [{ $lte: ['$stockQuantity', 0] }, 'Out of Stock', 'In Stock'],
            },
          },
        },
      ],
    },
  }));

  if (operations.length === 0) return [];
  return Product.bulkWrite(operations);
}

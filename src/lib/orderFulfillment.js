import mongoose from 'mongoose';

import Product from '@/models/Product';
import Vendor from '@/models/Vendor';
import mongooseConnect from '@/lib/mongooseConnect';
import { normalizeVendorSnapshot } from '@/lib/vendors';
import { normalizeProductImages } from '@/lib/productImages';

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

function resolveCheckoutUnitPrice(product, packLabel = '') {
  if (packLabel && Array.isArray(product.packOptions)) {
    const pack = product.packOptions.find(p => p.label === packLabel);
    if (pack) {
      return Math.max(0, toSafeNumber(pack.price));
    }
  }

  if (product.isDiscounted === true && product.discountedPrice != null) {
    return Math.max(0, toSafeNumber(product.discountedPrice));
  }

  return Math.max(0, toSafeNumber(product.Price));
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
      packLabel: toCleanString(item.packLabel || ''),
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

  requestedItems.forEach(item => {
    if (item.productId.startsWith('custom-') || item.productId.startsWith('unknown-')) {
      customItems.push({
        productId: item.productId,
        name: item.name,
        price: item.price,
        packLabel: item.packLabel,
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
    .select('slug Name Price discountedPrice isDiscounted isFreeDelivery vendors Images packOptions')
    .lean();
  const productMap = buildProductLookupMap(products);

  const missingProductIds = dbItems
    .map((item) => item.productId)
    .filter((productId) => !productMap.has(productId));
  if (missingProductIds.length > 0) {
    throw new Error(`Some checkout items are no longer available: ${missingProductIds.join(', ')}`);
  }

  const vendorIds = Array.from(
    new Set(
      products.flatMap((product) =>
        (Array.isArray(product.vendors) ? product.vendors : [])
          .map((vendor) => toCleanId(vendor.vendorId))
          .filter(Boolean)
      )
    )
  ).filter((value) => mongoose.Types.ObjectId.isValid(value));

  const vendors = vendorIds.length > 0
    ? await Vendor.find({ _id: { $in: vendorIds } }, 'name shopNumber phone whatsappNumber email address').lean()
    : [];
  const vendorMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor]));

  const sourcingMap = new Map();
  products.forEach((product) => {
    const sourcingVendors = (Array.isArray(product.vendors) ? product.vendors : [])
      .map(normalizeVendorSnapshot)
      .filter(Boolean)
      .map((entry) => {
        const vendor = vendorMap.get(toCleanId(entry.vendorId));
        return {
          vendorId: toCleanId(entry.vendorId),
          name: toCleanString(vendor?.name || entry.name),
          shopNumber: toCleanString(vendor?.shopNumber || entry.shopNumber),
          phone: toCleanString(vendor?.phone || entry.phone),
          whatsappNumber: toCleanString(vendor?.whatsappNumber || entry.whatsappNumber),
          email: toCleanString(vendor?.email || entry.email),
          address: toCleanString(vendor?.address || entry.address),
          vendorProductName: toCleanString(entry.vendorProductName),
          vendorPrice: entry.vendorPrice == null ? null : Math.max(0, toSafeNumber(entry.vendorPrice)),
        };
      });

    sourcingMap.set(product._id.toString(), sourcingVendors);
    if (product.slug) {
      sourcingMap.set(toCleanString(product.slug), sourcingVendors);
    }
  });

  const resolvedDbItems = dbItems.map((item) => {
    const product = productMap.get(item.productId);
    const images = normalizeProductImages(product.Images);
    
    let finalName = toCleanString(product.Name);
    if (item.packLabel && !finalName.includes(`(${item.packLabel})`)) {
      finalName = `${finalName} (${item.packLabel})`;
    }

    return {
      productId: item.productId,
      name: finalName,
      price: resolveCheckoutUnitPrice(product, item.packLabel),
      packLabel: item.packLabel,
      quantity: item.quantity,
      image: toCleanString(images[0]?.url),
      sourcingVendors: sourcingMap.get(item.productId) || [],
      isFreeDelivery: Boolean(product.isFreeDelivery),
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

  if (operations.length > 0) {
    await Product.bulkWrite(operations, { ordered: false });
  }

  return operations;
}

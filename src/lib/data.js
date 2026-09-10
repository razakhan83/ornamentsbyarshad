import 'server-only';
import mongoose from 'mongoose';
import { revalidateTag } from 'next/cache';
import { cacheLife } from 'next/cache';
import { cacheTag } from 'next/cache';

import Category from '@/models/Category';
import CoverPhoto from '@/models/CoverPhoto';
import HomePage from '@/models/HomePage';
import Order from '@/models/Order';
import OrderLog from '@/models/OrderLog';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import User from '@/models/User';
import Review from '@/models/Review';
import mongooseConnect from '@/lib/mongooseConnect';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import {
  HOME_PAGE_SINGLETON_KEY,
  HOME_PAGE_PRODUCT_COLLECTIONS,
  normalizeHomePageSections,
} from '@/lib/homePageSections';
import { normalizeEmail, getPhoneRegex } from '@/lib/admin';
import { normalizeVendorSnapshot } from '@/lib/vendors';
import { getSiteUrl } from '@/lib/siteUrl';
import {
  DEFAULT_ORDER_STATUS,
  getOrderStatusQueryValue,
  getOrderStatusSummaryCounts,
  normalizeOrderStatus,
} from '@/lib/order-status';
import {
  getProductCategories,
  getProductCategoryNames,
  hasProductCategory,
  normalizeCategoryId,
} from '@/lib/productCategories';
import { normalizeProductImages } from '@/lib/productImages';
import { DEFAULT_CUSTOM_PAGES, getCustomPageBySlug as findCustomPageBySlug, mergeCustomPages } from '@/lib/customPages';

const SETTINGS_KEY = 'site-settings';
const COVER_PHOTOS_KEY = 'home-cover-photos';
const HOME_MARKETING_SECTIONS = [
  { id: 'special-offers', label: 'Special Offer', iconName: 'Tag' },
  { id: 'new-arrivals', label: 'New Arrivals', iconName: 'Clock' },
  { id: 'best-selling', label: 'Best Selling', iconName: 'Trophy' },
];
const HOME_PAGE_PRODUCT_COLLECTION_CONFIG = {
  'featured': {
    label: 'Featured Products',
    viewAllHref: '/products?sort=featured',
  },
  'new-arrivals': {
    label: 'New Arrivals',
    viewAllHref: '/products?category=new-arrivals',
  },
  'best-sellers': {
    label: 'Best Sellers / Hot',
    viewAllHref: '/products?category=best-selling',
  },
  'special-offers': {
    label: 'Special Offers',
    viewAllHref: '/products?category=special-offers',
  },
  'top-rated': {
    label: 'Top Rated Products',
    viewAllHref: '',
  },
};
const PRODUCT_CATEGORY_POPULATE = { path: 'Category', select: 'name slug bgColor' };
const PRODUCT_CARD_PROJECTION = [
  'Name',
  'Description',
  'shortDescription',
  'Price',
  'compareAtPrice',
  'Images',
  'Category',
  'StockStatus',
  'slug',
  'showOnStore',
  'createdAt',
  'updatedAt',
  'discountPercentage',
  'isDiscounted',
  'discountedPrice',
  'isNewArrival',
  'isBestSelling',
  'isFeatured',
  'featuredPriority',
  'tags',
  'primaryTag',
].join(' ');
const PRODUCT_DETAIL_PROJECTION = [
  PRODUCT_CARD_PROJECTION,
  'stockQuantity',
  'seoTitle',
  'seoDescription',
  'seoKeywords',
  'seoCanonicalUrl',
  'seoOgTitle',
  'seoOgDescription',
  'seoOgImage',
  'seoOgImageRatio',
  'vendors',
  'packOptions',
].join(' ');
const PRODUCT_ADMIN_PROJECTION = [
  PRODUCT_CARD_PROJECTION,
  'stockQuantity',
  'vendors',
  'packOptions',
].join(' ');
let hasLoggedSettingsFetchFailure = false;
const SLOW_DATA_LOG_MS = 700;

async function measureDataAccess(label, loader) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[DATA] Failed ${label}:`, error.message);
    throw error;
  }
}

function sanitizeSectionOrder(order, fallbackOrder = []) {
  return Array.from(new Set([...(Array.isArray(order) ? order : []), ...fallbackOrder].filter(Boolean)));
}

function normalizeAnnouncementMessages(messages = [], fallbackText = '') {
  const rawMessages = Array.isArray(messages) && messages.length > 0
    ? messages
    : String(fallbackText || '')
        .split(/\r?\n|[|•]+/)
        .map((text) => ({ text }))
        .filter((entry) => String(entry?.text || '').trim());

  return rawMessages
    .map((entry, index) => ({
      id: String(entry?.id || `announcement-${index + 1}`).trim(),
      text: String(entry?.text || '').trim(),
      isActive: entry?.isActive !== false,
    }))
    .filter((entry) => entry.text);
}

function normalizeLogoUrl(value = '') {
  return optimizeCloudinaryUrl(String(value || '').trim(), {
    format: 'auto',
    quality: 'auto',
  });
}

function normalizeFaviconSize(value) {
  return Math.min(256, Math.max(32, Number(value) || 64));
}

function normalizeFaviconUrl(value = '', size = 64) {
  const normalizedSize = normalizeFaviconSize(size);
  return optimizeCloudinaryUrl(String(value || '').trim(), {
    width: normalizedSize,
    height: normalizedSize,
    crop: 'fill',
    gravity: 'auto',
    format: 'png',
    quality: 'auto',
  });
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeMediaItem(item, sortOrder = 0, fallbackItem = null) {
  if ((!item || typeof item !== 'object') && (!fallbackItem || typeof fallbackItem !== 'object')) return null;

  const source = item && typeof item === 'object' ? item : {};
  const fallback = fallbackItem && typeof fallbackItem === 'object' ? fallbackItem : {};
  const url = String(source.url || source.image || fallback.url || fallback.image || '').trim();
  if (!url) return null;

  return {
    url: optimizeCloudinaryUrl(url),
    publicId: String(source.publicId || source.public_id || fallback.publicId || fallback.public_id || '').trim(),
    blurDataURL: String(source.blurDataURL || fallback.blurDataURL || '').trim(),
    sortOrder: Number(source.sortOrder ?? sortOrder) || 0,
  };
}

function serializeProduct(product) {
  const { Image, ImageURL, ...safeProduct } = product;

  return {
    ...safeProduct,
    _id: safeProduct._id.toString(),
    id: safeProduct.slug || safeProduct._id.toString(),
    slug: safeProduct.slug || safeProduct._id.toString(),
    Category: getProductCategories(safeProduct),
    Images: normalizeProductImages(safeProduct.Images),
    vendors: Array.isArray(safeProduct.vendors)
      ? safeProduct.vendors.map(normalizeVendorSnapshot).filter(Boolean)
      : [],
    createdAt: safeProduct.createdAt ? new Date(safeProduct.createdAt).toISOString() : null,
    updatedAt: safeProduct.updatedAt ? new Date(safeProduct.updatedAt).toISOString() : null,
    isNewArrival: safeProduct.isNewArrival === true,
    isBestSelling: safeProduct.isBestSelling === true,
    isFeatured: safeProduct.isFeatured === true,
    isFreeDelivery: safeProduct.isFreeDelivery === true,
    featuredPriority: Number(safeProduct.featuredPriority || 0),
    tags: Array.isArray(safeProduct.tags) ? safeProduct.tags : [],
    primaryTag: safeProduct.primaryTag || '',
  };
}

function toProductCardItem(product) {
  return {
    id: product.id,
    _id: product._id,
    slug: product.slug,
    Name: product.Name,
    Price: Number(product.Price || 0),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    Description: product.Description || '',
    shortDescription: product.shortDescription || '',
    Category: product.Category,
    Images: product.Images,
    StockStatus: product.StockStatus || 'Out of Stock',
    createdAt: product.createdAt,
    showOnStore: product.showOnStore !== false,
    isNewArrival: product.isNewArrival === true,
    isBestSelling: product.isBestSelling === true,
    isFeatured: product.isFeatured === true,
    isFreeDelivery: product.isFreeDelivery === true,
    featuredPriority: Number(product.featuredPriority || 0),
    averageRating: Number(product.averageRating || 0),
    reviewCount: Number(product.reviewCount || 0),
    discountPercentage: Number(product.discountPercentage || 0),
    isDiscounted: product.isDiscounted === true,
    discountedPrice: product.discountedPrice != null ? Number(product.discountedPrice) : null,
    tags: Array.isArray(product.tags) ? product.tags : [],
    primaryTag: product.primaryTag || '',
  };
}

function toProductDetailView(product) {
  return {
    id: product.id,
    _id: product._id,
    slug: product.slug,
    Name: product.Name,
    Description: product.Description || '',
    shortDescription: product.shortDescription || '',
    Price: Number(product.Price || 0),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    Category: product.Category,
    Images: product.Images,
    StockStatus: product.StockStatus || 'Out of Stock',
    showOnStore: product.showOnStore !== false,
    stockQuantity: Number(product.stockQuantity || 0),
    createdAt: product.createdAt,
    vendors: Array.isArray(product.vendors)
      ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
      : [],
    discountPercentage: Number(product.discountPercentage || 0),
    isDiscounted: product.isDiscounted === true,
    discountedPrice: product.discountedPrice != null ? Number(product.discountedPrice) : null,
    packOptions: Array.isArray(product.packOptions) ? product.packOptions : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    primaryTag: product.primaryTag || '',
    isNewArrival: product.isNewArrival === true,
    isBestSelling: product.isBestSelling === true,
    isFeatured: product.isFeatured === true,
    isFreeDelivery: product.isFreeDelivery === true,
    featuredPriority: Number(product.featuredPriority || 0),
    seoTitle: product.seoTitle || '',
    seoDescription: product.seoDescription || '',
    seoKeywords: product.seoKeywords || '',
    seoCanonicalUrl: product.seoCanonicalUrl || '',
    seoOgTitle: product.seoOgTitle || '',
    seoOgDescription: product.seoOgDescription || '',
    seoOgImage: product.seoOgImage || '',
    seoOgImageRatio: product.seoOgImageRatio || '1.91:1',
  };
}

function toAdminProductRow(product) {
  return {
    id: product.id,
    _id: product._id,
    slug: product.slug,
    Name: product.Name,
    Price: Number(product.Price || 0),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    Category: product.Category,
    Images: product.Images,
    StockStatus: product.StockStatus || 'Out of Stock',
    stockQuantity: Number(product.stockQuantity || 0),
    showOnStore: product.showOnStore !== false,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    isNewArrival: product.isNewArrival === true,
    isBestSelling: product.isBestSelling === true,
    isFeatured: product.isFeatured === true,
    isFreeDelivery: product.isFreeDelivery === true,
    featuredPriority: Number(product.featuredPriority || 0),
    vendors: Array.isArray(product.vendors)
      ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
      : [],
    discountPercentage: Number(product.discountPercentage || 0),
    isDiscounted: product.isDiscounted === true,
    discountedPrice: product.discountedPrice != null ? Number(product.discountedPrice) : null,
    packOptions: Array.isArray(product.packOptions) ? product.packOptions : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    primaryTag: product.primaryTag || '',
  };
}

function buildCustomerAggregationPipeline({ search = '', skip = 0, limit = 12 } = {}) {
  const safeSearch = String(search || '').trim();
  const searchRegex = safeSearch ? new RegExp(escapeRegex(safeSearch), 'i') : null;

  const pipeline = [];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { customerPhone: searchRegex },
          { customerCity: searchRegex },
          { customerAddress: searchRegex },
          { orderId: searchRegex },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [
            { $ne: [{ $ifNull: ['$customerEmail', ''] }, ''] },
            { $ifNull: ['$customerEmail', ''] },
            {
              $cond: [
                { $ne: [{ $ifNull: ['$customerPhone', ''] }, ''] },
                { $ifNull: ['$customerPhone', ''] },
                { $toString: '$_id' },
              ],
            },
          ],
        },
        name: { $first: '$customerName' },
        email: { $first: { $ifNull: ['$customerEmail', ''] } },
        phone: { $first: '$customerPhone' },
        city: { $first: '$customerCity' },
        address: { $first: '$customerAddress' },
        landmark: { $first: '$landmark' },
        lastOrderAt: { $max: '$createdAt' },
        firstOrderAt: { $min: '$createdAt' },
        ordersCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' },
      },
    },
    { $sort: { lastOrderAt: -1 } },
    {
      $facet: {
        items: [
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: 'count' }],
        summary: [
          {
            $group: {
              _id: null,
              totalCustomers: { $sum: 1 },
              withEmail: {
                $sum: {
                  $cond: [{ $ne: ['$email', ''] }, 1, 0],
                },
              },
              withPhone: {
                $sum: {
                  $cond: [{ $ne: ['$phone', ''] }, 1, 0],
                },
              },
              withAddress: {
                $sum: {
                  $cond: [{ $ne: ['$address', ''] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  );

  return pipeline;
}

function toOrderSummaryRow(order) {
  return {
    _id: order._id.toString(),
    orderId: order.orderId,
    isDraft: order.isDraft === true,
    sourceTag: order.sourceTag || '',
    customerName: order.customerName,
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || '',
    customerAddress: order.customerAddress || '',
    customerCity: order.customerCity || '',
    landmark: order.landmark || '',
    paymentStatus: order.paymentStatus || 'COD',
    weight: Number(order.weight ?? 2),
    manualCodAmount: order.manualCodAmount,
    itemType: order.itemType || 'Mix',
    orderQuantity: Number(order.orderQuantity || 1),
    totalAmount: Number(order.totalAmount || 0),
    shippingAmount: order.shippingAmount != null ? Number(order.shippingAmount) : null,
    discountAmount: order.discountAmount != null ? Number(order.discountAmount) : 0,
    status: normalizeOrderStatus(order.status),
    notes: order.notes || '',
    courierName: order.courierName || '',
    trackingNumber: order.trackingNumber || '',
    nocAccountId: order.nocAccountId || 'portal_1',
    nocLabelUrl: order.nocLabelUrl || '',
    courierBookingStatus: order.courierBookingStatus || 'none',
    nocStatus: order.nocStatus || '',
    nocStatusTime: order.nocStatusTime || '',
    nocParcelNo: order.nocParcelNo || '',
    nocThirdPartyNo: order.nocThirdPartyNo || '',
    nocRemarks: order.nocRemarks || '',
    nocLastTrackedAt: order.nocLastTrackedAt ? new Date(order.nocLastTrackedAt).toISOString() : null,
    nocTrackingEvents: Array.isArray(order.nocTrackingEvents)
      ? order.nocTrackingEvents.map((e) => ({
          status: e.status || '',
          remarks: e.remarks || '',
          dateTime: e.dateTime || '',
          timestamp: e.timestamp || 0,
        }))
      : [],
    courierBookingDate: order.courierBookingDate ? new Date(order.courierBookingDate).toISOString() : null,
    courierResponseDetails: order.courierResponseDetails || null,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          _id: item._id?.toString(),
          productId: item.productId?.toString() || item.productId,
          sourcingVendors: Array.isArray(item.sourcingVendors)
            ? item.sourcingVendors
                .map((vendor) => normalizeVendorSnapshot(vendor))
                .filter(Boolean)
            : [],
        }))
      : [],
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
    updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : null,
  };
}

async function getLiveProductsRaw() {
  'use cache';
  cacheLife('hours');
  cacheTag('products', 'categories');

  return measureDataAccess('getLiveProductsRaw', async () => {
    await mongooseConnect();

    const products = await Product.find({ showOnStore: true })
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort({ createdAt: -1 })
      .lean();
    return products.map(serializeProduct);
  });
}

async function getAllProductsRaw() {
  await mongooseConnect();

  const products = await Product.find({})
    .select(PRODUCT_ADMIN_PROJECTION)
    .populate(PRODUCT_CATEGORY_POPULATE)
    .sort({ createdAt: -1 })
    .lean();
  return products.map(serializeProduct);
}

async function getSettingsRaw() {
  const defaultSettings = {
    _id: 'default',
    storeName: 'China Unique Store',
    supportEmail: '',
    businessAddress: '',
    lightLogoUrl: '',
    darkLogoUrl: '',
    faviconUrl: '',
    faviconSizePx: 64,
    logoScalePercent: 100,
    emailLogoScalePercent: 100,
    invoiceLogoScalePercent: 100,
    whatsappNumber: '',
    facebookPageUrl: '',
    instagramUrl: '',
    trackingEnabled: false,
    facebookPixelId: '',
    tiktokPixelId: '',
    karachiDeliveryFee: 200,
    outsideKarachiDeliveryFee: 300,
    freeShippingThreshold: 5000,
    announcementBarEnabled: true,
    announcementBarText: '',
    announcementBarMessages: [],
    bankDepositEnabled: false,
    bankDepositAccountDetails: '',
    homepageSectionOrder: [],
    customPages: DEFAULT_CUSTOM_PAGES,
  };

  try {
    return await measureDataAccess('getSettingsRaw', async () => {
      await mongooseConnect();

      let settings = await Settings.findOne({ singletonKey: SETTINGS_KEY }).lean();
      if (!settings) {
        settings = await Settings.create({ singletonKey: SETTINGS_KEY });
        settings = settings.toObject();
      }

      return {
        _id: settings._id.toString(),
        storeName: settings.storeName || 'China Unique Store',
        supportEmail: settings.supportEmail || '',
        businessAddress: settings.businessAddress || '',
        lightLogoUrl: normalizeLogoUrl(settings.lightLogoUrl),
        darkLogoUrl: normalizeLogoUrl(settings.darkLogoUrl),
        faviconSizePx: normalizeFaviconSize(settings.faviconSizePx),
        faviconUrl: normalizeFaviconUrl(settings.faviconUrl, settings.faviconSizePx),
        logoScalePercent: Math.min(200, Math.max(60, Number(settings.logoScalePercent || 100))),
        emailLogoScalePercent: Math.min(200, Math.max(40, Number(settings.emailLogoScalePercent || 100))),
        invoiceLogoScalePercent: Math.min(200, Math.max(40, Number(settings.invoiceLogoScalePercent || 100))),
        whatsappNumber: settings.whatsappNumber || '',
        facebookPageUrl: settings.facebookPageUrl || '',
        instagramUrl: settings.instagramUrl || '',
        trackingEnabled: settings.trackingEnabled === true,
        facebookPixelId: settings.facebookPixelId || '',
        tiktokPixelId: settings.tiktokPixelId || '',
        karachiDeliveryFee: Number(settings.karachiDeliveryFee || 200),
        outsideKarachiDeliveryFee: Number(settings.outsideKarachiDeliveryFee || 300),
        freeShippingThreshold: Number(settings.freeShippingThreshold || 5000),
        announcementBarEnabled: settings.announcementBarEnabled ?? true,
        announcementBarText: settings.announcementBarText || '',
        announcementBarMessages: normalizeAnnouncementMessages(settings.announcementBarMessages, settings.announcementBarText),
        bankDepositEnabled: settings.bankDepositEnabled === true,
        bankDepositAccountDetails: settings.bankDepositAccountDetails || '',
        homepageSectionOrder: Array.isArray(settings.homepageSectionOrder) ? settings.homepageSectionOrder : [],
        customPages: mergeCustomPages(settings.customPages),
        guestModeEnabled: settings.guestModeEnabled !== false,
        enableSecondaryNoc: settings.enableSecondaryNoc === true,
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('[BUILD] MongoDB connection failed during build, returning default settings.');
    } else if (!hasLoggedSettingsFetchFailure) {
      console.error('[DB] Error fetching settings:', error.message);
      hasLoggedSettingsFetchFailure = true;
    }
    return defaultSettings;
  }
}

async function getCoverPhotosRaw() {
  await mongooseConnect();

  let coverPhoto = await CoverPhoto.findOne({ singletonKey: COVER_PHOTOS_KEY }).lean();
  if (!coverPhoto) {
    coverPhoto = await CoverPhoto.create({ singletonKey: COVER_PHOTOS_KEY });
    coverPhoto = coverPhoto.toObject();
  }

  return Array.isArray(coverPhoto.slides)
    ? coverPhoto.slides
        .map((item, index) => {
          const desktopImage = normalizeMediaItem(
            item.desktopImage || {
              url: item.url,
              publicId: item.publicId,
              blurDataURL: item.blurDataURL,
            },
            index,
          );
          if (!desktopImage) return null;
          const tabletImage = normalizeMediaItem(item.tabletImage, index, desktopImage);
          const mobileImage = normalizeMediaItem(item.mobileImage, index, desktopImage);

          return {
            desktopImage,
            tabletImage,
            mobileImage,
            alt: String(item.alt || '').trim(),
            sortOrder: Number(item.sortOrder ?? index) || 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
}

async function getCategoriesRaw() {
  await mongooseConnect();

  const dbCategories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
  let mappedCategories = [];
  if (dbCategories.length > 0) {
    return dbCategories.map((category) => ({
      _id: category._id.toString(),
      id: category.slug || normalizeCategoryId(category.name),
      label: category.name,
      image: optimizeCloudinaryUrl(category.image || ''),
      imagePublicId: category.imagePublicId || '',
      blurDataURL: category.blurDataURL || '',
      secondaryImage: optimizeCloudinaryUrl(category.secondaryImage || ''),
      secondaryImagePublicId: category.secondaryImagePublicId || '',
      secondaryBlurDataURL: category.secondaryBlurDataURL || '',
      tertiaryImage: optimizeCloudinaryUrl(category.tertiaryImage || ''),
      tertiaryImagePublicId: category.tertiaryImagePublicId || '',
      tertiaryBlurDataURL: category.tertiaryBlurDataURL || '',
      bgColor: category.bgColor || '',
      sortOrder: category.sortOrder ?? 0,
      isEnabled: category.isEnabled !== false,
      showOnHome: category.showOnHome !== false,
      storefrontProductLimit: Math.min(24, Math.max(1, Number(category.storefrontProductLimit || 8))),
      featuredProductIds: Array.isArray(category.featuredProductIds)
        ? category.featuredProductIds.map((id) => (id?._id ? id._id.toString() : id.toString())).filter(Boolean)
        : [],
      showcaseSelectionMode: category.showcaseSelectionMode || 'pinned_first',
    }));
  }

  return [];

  const products = await getLiveProductsRaw();
  const categoryMap = new Map();

  for (const product of products) {
    for (const category of getProductCategories(product)) {
      const trimmed = String(category.name || '').trim();
      if (!trimmed) continue;
      const id = category.id || normalizeCategoryId(trimmed);
      if (!categoryMap.has(id)) {
        categoryMap.set(id, {
          id,
          label: trimmed,
          image: '',
          imagePublicId: '',
          blurDataURL: '',
          showOnHome: true,
        });
      }
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildDefaultHomePageSections({ categories = [], coverPhotos = [] } = {}) {
  const activeCategories = categories.filter(
    (category) => category.isEnabled !== false && category.id !== 'special-offers',
  );

  const sections = [];

  if (coverPhotos.length > 0) {
    sections.push({
      id: 'hero-slider-default',
      type: 'HeroSlider',
      order: sections.length,
      title: 'Hero Slider',
      slides: coverPhotos.map((slide, index) => ({
        desktopImage: slide.desktopImage,
        tabletImage: slide.tabletImage,
        mobileImage: slide.mobileImage || slide.tabletImage || slide.desktopImage,
        alt: slide.alt || `Store cover ${index + 1}`,
        sortOrder: index,
      })),
    });
  }

  sections.push({
    id: 'categories-grid-default',
    type: 'CategoriesGrid',
    order: sections.length,
    title: 'Shop by Category',
  });

  HOME_PAGE_PRODUCT_COLLECTIONS.forEach((collectionKey) => {
    sections.push({
      id: `collection-${collectionKey}`,
      type: 'ProductCollection',
      order: sections.length,
      title: HOME_PAGE_PRODUCT_COLLECTION_CONFIG[collectionKey]?.label || '',
      collectionKey,
      productLimit: 8,
    });
  });

  activeCategories.forEach((category) => {
    sections.push({
      id: `category-${category.id}`,
      type: 'ProductGridByCategory',
      order: sections.length,
      title: category.label,
      categoryId: category._id,
      productLimit: 8,
    });
  });

  return normalizeHomePageSections(sections);
}

async function getHomePageRaw() {
  await mongooseConnect();

  let homePage = await HomePage.findOne({ singletonKey: HOME_PAGE_SINGLETON_KEY }).lean();

  if (!homePage) {
    const [categories, coverPhotos] = await Promise.all([getCategoriesRaw(), getCoverPhotosRaw()]);
    homePage = await HomePage.create({
      singletonKey: HOME_PAGE_SINGLETON_KEY,
      sections: buildDefaultHomePageSections({ categories, coverPhotos }),
    });
    homePage = homePage.toObject();
  }

  return {
    _id: homePage._id.toString(),
    sections: normalizeHomePageSections(homePage.sections),
  };
}

async function getProductsForHomeCategorySectionsRaw(categoryIds = []) {
  const uniqueIds = Array.from(new Set((Array.isArray(categoryIds) ? categoryIds : []).filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  await mongooseConnect();

  const products = await Product.find({
    showOnStore: true,
    Category: { $in: uniqueIds },
  })
    .select(PRODUCT_CARD_PROJECTION)
    .populate(PRODUCT_CATEGORY_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  return products.map(serializeProduct);
}

async function getProductsForHomeCollectionSectionsRaw(collectionKeys = [], limitByCollection = new Map()) {
  const uniqueKeys = Array.from(
    new Set((Array.isArray(collectionKeys) ? collectionKeys : []).filter((key) => HOME_PAGE_PRODUCT_COLLECTIONS.includes(key))),
  );
  if (uniqueKeys.length === 0) return new Map();

  await mongooseConnect();

  const results = new Map();

  // 1. FEATURED PRODUCTS (Ads / Admin Pinned)
  if (uniqueKeys.includes('featured')) {
    const requestedLimit = Math.max(1, Number(limitByCollection.get('featured') || 8));
    const products = await Product.find({
      showOnStore: true,
      isFeatured: true,
    })
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort({ featuredPriority: -1, createdAt: -1 })
      .limit(Math.min(24, requestedLimit))
      .lean();

    results.set('featured', products.map((p) => toProductCardItem(serializeProduct(p))));
  }

  // 2. NEW ARRIVALS (Time-based automatic + Manual Admin Override)
  if (uniqueKeys.includes('new-arrivals')) {
    const requestedLimit = Math.max(1, Number(limitByCollection.get('new-arrivals') || 8));
    // Fetch manual flagged first + recent products (within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let products = await Product.find({
      showOnStore: true,
      $or: [
        { isNewArrival: true },
        { createdAt: { $gte: thirtyDaysAgo } }
      ]
    })
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort({ isNewArrival: -1, createdAt: -1 })
      .limit(Math.min(24, requestedLimit))
      .lean();

    // Fallback: If less than 4 products match 30-day window, fill with latest products
    if (products.length < Math.min(4, requestedLimit)) {
      products = await Product.find({ showOnStore: true })
        .select(PRODUCT_CARD_PROJECTION)
        .populate(PRODUCT_CATEGORY_POPULATE)
        .sort({ isNewArrival: -1, createdAt: -1 })
        .limit(Math.min(24, requestedLimit))
        .lean();
    }

    results.set('new-arrivals', products.map((p) => toProductCardItem(serializeProduct(p))));
  }

  // 3. BEST SELLERS / HOT (Automatic Sales Count from Orders + Manual Admin Override)
  if (uniqueKeys.includes('best-sellers')) {
    const requestedLimit = Math.max(1, Number(limitByCollection.get('best-sellers') || 8));
    
    // Step A: Fetch manual admin picks
    const manualBestSellers = await Product.find({
      showOnStore: true,
      isBestSelling: true,
    })
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort({ createdAt: -1 })
      .limit(Math.min(24, requestedLimit))
      .lean();

    const manualIds = new Set(manualBestSellers.map((p) => p._id.toString()));
    const combinedProducts = [...manualBestSellers];

    // Step B: Fetch top sold products from Orders if more slots needed
    if (combinedProducts.length < requestedLimit) {
      try {
        const topSoldAggregation = await Order.aggregate([
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              totalSold: { $sum: '$items.quantity' },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: Math.max(requestedLimit * 3, 20) },
        ]);

        const topSoldIds = topSoldAggregation
          .map((item) => item._id)
          .filter((id) => id && !manualIds.has(String(id)));

        const objectIds = [];
        const slugs = [];
        for (const id of topSoldIds) {
          if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
            objectIds.push(id);
          } else if (id) {
            slugs.push(id);
          }
        }

        const query = [];
        if (objectIds.length > 0) query.push({ _id: { $in: objectIds } });
        if (slugs.length > 0) query.push({ slug: { $in: slugs } });

        if (query.length > 0) {
          const autoBestSellers = await Product.find({
            showOnStore: true,
            $or: query,
          })
            .select(PRODUCT_CARD_PROJECTION)
            .populate(PRODUCT_CATEGORY_POPULATE)
            .lean();

          const autoMap = new Map();
          autoBestSellers.forEach((p) => {
            autoMap.set(p._id.toString(), p);
            if (p.slug) autoMap.set(p.slug, p);
          });

          for (const item of topSoldAggregation) {
            const foundProduct = autoMap.get(String(item._id));
            if (foundProduct && !manualIds.has(foundProduct._id.toString())) {
              manualIds.add(foundProduct._id.toString());
              combinedProducts.push(foundProduct);
              if (combinedProducts.length >= requestedLimit) break;
            }
          }
        }
      } catch (err) {
        console.error('[DATA] Error aggregating best sellers:', err.message);
      }
    }

    // Step C: If still empty/short, fallback to featured / newest
    if (combinedProducts.length < Math.min(4, requestedLimit)) {
      const remainingNeeded = Math.min(24, requestedLimit) - combinedProducts.length;
      const extraProducts = await Product.find({
        showOnStore: true,
        _id: { $nin: Array.from(manualIds) },
      })
        .select(PRODUCT_CARD_PROJECTION)
        .populate(PRODUCT_CATEGORY_POPULATE)
        .sort({ isBestSelling: -1, createdAt: -1 })
        .limit(remainingNeeded)
        .lean();

      combinedProducts.push(...extraProducts);
    }

    results.set(
      'best-sellers',
      combinedProducts.slice(0, requestedLimit).map((p) => toProductCardItem(serializeProduct(p)))
    );
  }

  // 4. SPECIAL OFFERS / DEALS
  if (uniqueKeys.includes('special-offers')) {
    const requestedLimit = Math.max(1, Number(limitByCollection.get('special-offers') || 8));
    const products = await Product.find({
      showOnStore: true,
      isDiscounted: true,
    })
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort({ discountPercentage: -1, createdAt: -1 })
      .limit(Math.min(24, requestedLimit))
      .lean();

    results.set('special-offers', products.map((p) => toProductCardItem(serializeProduct(p))));
  }

  // 5. TOP RATED
  if (uniqueKeys.includes('top-rated')) {
    const Review = (await import('@/models/Review')).default;
    const requestedLimit = Math.max(1, Number(limitByCollection.get('top-rated') || 8));
    const reviewSummaries = await Review.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1, reviewCount: -1, _id: 1 } },
      { $limit: Math.max(requestedLimit * 4, 24) },
    ]);

    const productIds = reviewSummaries.map((entry) => entry._id).filter(Boolean);
    const topRatedProducts = productIds.length > 0
      ? await Product.find({
          _id: { $in: productIds },
          showOnStore: true,
        })
          .select(PRODUCT_CARD_PROJECTION)
          .populate(PRODUCT_CATEGORY_POPULATE)
          .lean()
      : [];

    const productMap = new Map(
      topRatedProducts.map((product) => {
        const serialized = serializeProduct(product);
        return [serialized._id, serialized];
      }),
    );

    const items = reviewSummaries
      .map((summary) => {
        const product = productMap.get(String(summary._id));
        if (!product) return null;

        return toProductCardItem({
          ...product,
          averageRating: Number(summary.averageRating || 0),
          reviewCount: Number(summary.reviewCount || 0),
        });
      })
      .filter(Boolean)
      .slice(0, Math.min(24, requestedLimit));

    results.set('top-rated', items);
  }

  return results;
}

export async function getStoreSettings() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('settings');
  return getSettingsRaw();
}

export async function getStoreCustomPageBySlug(slug = '') {
  'use cache';
  cacheLife('foreverish');
  cacheTag('settings');

  const settings = await getSettingsRaw();
  return findCustomPageBySlug(settings.customPages, slug);
}

export async function getAdminCoverPhotos() {
  await mongooseConnect();

  let coverPhoto = await CoverPhoto.findOne({ singletonKey: COVER_PHOTOS_KEY }).lean();
  if (!coverPhoto) {
    coverPhoto = await CoverPhoto.create({ singletonKey: COVER_PHOTOS_KEY });
    coverPhoto = coverPhoto.toObject();
  }

  return Array.isArray(coverPhoto.slides)
    ? coverPhoto.slides
        .map((item, index) => {
          const desktopImage = normalizeMediaItem(
            item.desktopImage || {
              url: item.url,
              publicId: item.publicId,
              blurDataURL: item.blurDataURL,
            },
            index,
          );
          if (!desktopImage) return null;
          const tabletImage = normalizeMediaItem(item.tabletImage, index, desktopImage);
          const mobileImage = normalizeMediaItem(item.mobileImage, index, desktopImage);

          return {
            desktopImage,
            tabletImage,
            mobileImage,
            alt: String(item.alt || '').trim(),
            sortOrder: Number(item.sortOrder ?? index) || 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
}

export async function getStoreCategories() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('categories');
  const categories = await getCategoriesRaw();
  return categories.filter((category) => category.isEnabled !== false && category.id !== 'special-offers');
}

export async function getHomeSections() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('home-sections', 'products', 'categories', 'cover-photos');
  const [products, categories, coverPhotos, settings] = await Promise.all([
    getLiveProductsRaw(),
    getCategoriesRaw(),
    getCoverPhotosRaw(),
    getSettingsRaw(),
  ]);
  const featuredProducts = products.slice(0, 8).map(toProductCardItem);
  const sections = categories
    .map((category) => {
      let items;
      let label = category?.label || 'Special Offers';
      if (category.id === 'special-offers') {
        const discountedProducts = products
          .filter((product) => product.isDiscounted === true)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 12)
          .map(toProductCardItem);
        
        items = discountedProducts;
        
        // Ensure the label is clean
        if (label.includes('🏷️')) {
          category.label = label.replace(' 🏷️', '');
        }
        category.iconName = 'Tag';
      } else {
        items = products
          .filter((product) => hasProductCategory(product, category.id))
          .slice(0, 8)
          .map(toProductCardItem);
      }

      return {
        category,
        products: items,
      };
    })
    .filter((section) => 
      (
        section.category.id === 'special-offers' ||
        section.category.showOnHome !== false
      ) &&
      (section.category.id === 'special-offers' || section.products.length > 0)
    );

  // Add the dynamic marketing sections (New Arrivals, Trending, Best Selling)
  const marketingSections = [
    { id: 'new-arrivals', label: 'New Arrivals', flag: 'isNewArrival', iconName: 'Clock' },
    { id: 'best-selling', label: 'Best Selling', flag: 'isBestSelling', iconName: 'Trophy' },
  ].map(m => {
    const items = products
      .filter(p => p[m.flag] === true)
      .slice(0, 8)
      .map(toProductCardItem);
    
    if (items.length === 0) return null;

    return {
      category: {
        id: m.id,
        label: m.label,
        iconName: m.iconName,
        image: '',
        isEnabled: true,
      },
      products: items
    };
  }).filter(Boolean);

  const defaultOrder = [
    ...HOME_MARKETING_SECTIONS.map((section) => section.id),
    ...categories
      .filter((category) => !HOME_MARKETING_SECTIONS.some((section) => section.id === category.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => category.id),
  ];
  const fullOrder = sanitizeSectionOrder(settings.homepageSectionOrder, defaultOrder);

  const sectionMap = new Map(
    [...sections, ...marketingSections].map((section) => [section.category.id, section])
  );
  const orderedSections = fullOrder
    .map((id) => sectionMap.get(id))
    .filter(Boolean);
  const remainingSections = [...sectionMap.values()].filter(
    (section) => !fullOrder.includes(section.category.id)
  );
  const finalSections = [...orderedSections, ...remainingSections];

  return {
    categories: categories.filter((category) => category.isEnabled !== false && category.id !== 'special-offers'),
    coverPhotos,
    featuredProducts,
    sections: finalSections,
  };
}

export async function getAdminHomePageBuilderData() {
  const [homePage, categories] = await Promise.all([getHomePageRaw(), getCategoriesRaw()]);

  return {
    sections: homePage.sections,
    categories: categories
      .filter((category) => category.isEnabled !== false && category.id !== 'special-offers')
      .map((category) => ({
        _id: category._id,
        id: category.id,
        label: category.label,
      })),
  };
}

export async function getStorefrontHomePage() {
  try {
    const [homePage, categories] = await Promise.all([getHomePageRaw(), getCategoriesRaw()]);
    const activeCategories = categories.filter(
      (category) => category.isEnabled !== false && category.id !== 'special-offers',
    );
    const categoryMap = new Map(categories.map((category) => [category._id, category]));
    const categorySectionIds = homePage.sections
      .filter((section) => section.isEnabled !== false && section.type === 'ProductGridByCategory')
      .map((section) => section.categoryId)
      .filter(Boolean);
    const collectionSections = homePage.sections.filter(
      (section) => section.isEnabled !== false && section.type === 'ProductCollection',
    );
    const collectionLimitMap = new Map();
    collectionSections.forEach((section) => {
      const currentLimit = Number(collectionLimitMap.get(section.collectionKey) || 0);
      collectionLimitMap.set(
        section.collectionKey,
        Math.max(currentLimit, Number(section.productLimit || 8)),
      );
    });
    const categoryProducts = await getProductsForHomeCategorySectionsRaw(categorySectionIds);
    const collectionProductsMap = await getProductsForHomeCollectionSectionsRaw(
      collectionSections.map((section) => section.collectionKey),
      collectionLimitMap,
    );
    const productsByCategoryId = new Map();

    for (const product of categoryProducts) {
      const cardItem = toProductCardItem(product);

      for (const category of getProductCategories(product)) {
        const categoryId = String(category._id || '');
        if (!categoryId || !categorySectionIds.includes(categoryId)) continue;

        if (!productsByCategoryId.has(categoryId)) {
          productsByCategoryId.set(categoryId, []);
        }

        const items = productsByCategoryId.get(categoryId);
        if (!items.some((item) => item._id === cardItem._id)) {
          items.push(cardItem);
        }
      }
    }

    const sections = homePage.sections
      .filter((section) => section.isEnabled !== false)
      .map((section) => {
        if (section.type === 'HeroSlider') {
          const slides = Array.isArray(section.slides)
            ? section.slides.filter((slide) =>
                Boolean(
                  slide?.desktopImage?.url ||
                  slide?.mobileImage?.url ||
                  slide?.pcSrc ||
                  slide?.mobileSrc ||
                  slide?.image ||
                  slide?.src
                )
              )
            : [];

          return slides.length > 0 ? { ...section, slides } : null;
        }

        if (section.type === 'CategoriesGrid') {
          return activeCategories.length > 0 ? { ...section, categories: activeCategories } : null;
        }

        if (section.type === 'ProductBanner') {
          const desktopImages = Array.isArray(section.desktopImages)
            ? section.desktopImages.filter((item) => item?.image?.url).slice(0, 2)
            : [];
          const mobileImage = section.mobileImage?.image?.url ? section.mobileImage : null;

          return desktopImages.length === 2 && mobileImage
            ? {
                ...section,
                desktopImages,
                mobileImage,
              }
            : null;
        }

        if (section.type === 'ScrollableBannerCarousel') {
          const carouselBanners = Array.isArray(section.carouselBanners)
            ? section.carouselBanners.filter((item) => item?.image?.url)
            : [];

          return carouselBanners.length > 0
            ? {
                ...section,
                carouselBanners,
              }
            : null;
        }

        if (section.type === 'ProductGridByCategory') {
          const category = categoryMap.get(section.categoryId);
          if (!category || category.isEnabled === false) return null;

          const limit = Math.min(24, Math.max(1, Number(section.productLimit || category.storefrontProductLimit || 8)));
          const allCategoryItems = productsByCategoryId.get(section.categoryId) || [];
          const itemMap = new Map(allCategoryItems.map((item) => [String(item._id), item]));
          const pinnedIds = Array.isArray(category.featuredProductIds) ? category.featuredProductIds : [];
          const mode = category.showcaseSelectionMode || 'pinned_first';

          let resolvedProducts = [];

          if (mode === 'curated_only') {
            for (const pid of pinnedIds) {
              const matched = itemMap.get(String(pid));
              if (matched && !resolvedProducts.some((p) => p._id === matched._id)) {
                resolvedProducts.push(matched);
                if (resolvedProducts.length >= limit) break;
              }
            }
          } else if (mode === 'latest') {
            resolvedProducts = allCategoryItems.slice(0, limit);
          } else {
            // 'pinned_first'
            for (const pid of pinnedIds) {
              const matched = itemMap.get(String(pid));
              if (matched && !resolvedProducts.some((p) => p._id === matched._id)) {
                resolvedProducts.push(matched);
                if (resolvedProducts.length >= limit) break;
              }
            }
            if (resolvedProducts.length < limit) {
              for (const item of allCategoryItems) {
                if (!resolvedProducts.some((p) => p._id === item._id)) {
                  resolvedProducts.push(item);
                  if (resolvedProducts.length >= limit) break;
                }
              }
            }
          }

          if (resolvedProducts.length === 0) return null;

          return {
            ...section,
            category,
            products: resolvedProducts,
          };
        }

        if (section.type === 'ProductCollection') {
          const collectionKey = HOME_PAGE_PRODUCT_COLLECTIONS.includes(section.collectionKey)
            ? section.collectionKey
            : 'new-arrivals';
          const config = HOME_PAGE_PRODUCT_COLLECTION_CONFIG[collectionKey];
          const products = (collectionProductsMap.get(collectionKey) || []).slice(0, section.productLimit || 8);

          if (!config || products.length === 0) return null;

          return {
            ...section,
            collectionKey,
            title: section.title || config.label,
            viewAllHref: config.viewAllHref || '',
            products,
          };
        }

        if (section.type === 'VideoCatalog') {
          const pcVideo = section.pcVideo?.url ? section.pcVideo : null;
          const mobileVideo = section.mobileVideo?.url ? section.mobileVideo : null;

          return pcVideo || mobileVideo
            ? {
                ...section,
                pcVideo,
                mobileVideo,
              }
            : null;
        }

        if (section.type === 'CustomerReviews') {
          return {
            ...section,
          };
        }

        return null;
      })
      .filter(Boolean);

    // If CustomerReviews section is included, load testimonials
    const hasReviewsSection = sections.some((s) => s.type === 'CustomerReviews');
    let testimonials = [];
    if (hasReviewsSection) {
      const reviewSection = sections.find((s) => s.type === 'CustomerReviews');
      testimonials = await getStorefrontTestimonials(reviewSection?.reviewLimit || 10).catch(() => []);
    }

    const finalSections = sections
      .map((section) => {
        if (section.type === 'CustomerReviews') {
          if (!testimonials || testimonials.length === 0) return null;
          return {
            ...section,
            reviews: testimonials,
          };
        }
        return section;
      })
      .filter(Boolean);

    return { sections: finalSections };
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('[BUILD] MongoDB connection failed while building homepage, returning empty sections.');
      return { sections: [] };
    }

    throw error;
  }
}

export async function getProductsList({ category = 'all', search = '', sort = 'newest', page = 1, limit = 12, price = 'all' } = {}) {
  'use cache';
  cacheLife('foreverish');
  cacheTag('products', 'categories');

  await mongooseConnect();

  const safeCategory = String(category || 'all').trim() || 'all';
  const safeSearch = String(search || '').trim();
  const safeSort = String(sort || 'newest').trim() || 'newest';
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 12);

  const query = { showOnStore: true };

  if (price === 'under300' || price === 'under-300' || price === 'dollar-store' || price === 'dollar') {
    query.Price = { $lte: 300 };
  } else if (price === 'under500') {
    query.Price = { $lte: 500 };
  } else if (price === 'under1000') {
    query.Price = { $lte: 1000 };
  } else if (price === '500-1500') {
    query.Price = { $gte: 500, $lte: 1500 };
  } else if (price === '1500-5000') {
    query.Price = { $gte: 1500, $lte: 5000 };
  } else if (price === 'above5000') {
    query.Price = { $gt: 5000 };
  }

  if (safeCategory === 'featured') {
    query.isFeatured = true;
  } else if (safeCategory === 'new-arrivals') {
    query.isNewArrival = true;
  } else if (safeCategory === 'best-selling') {
    query.isBestSelling = true;
  } else if (safeCategory === 'special-offers') {
    query.isDiscounted = true;
  } else if (safeCategory && safeCategory !== 'all') {
    const categories = await getCategoriesRaw();
    const matchedCategory = categories.find(
      (entry) =>
        entry.id === safeCategory ||
        entry._id === safeCategory ||
        (entry.slug && entry.slug === safeCategory) ||
        entry.label?.toLowerCase() === safeCategory.toLowerCase()
    );

    if (matchedCategory?._id) {
      query.Category = matchedCategory._id;
    } else {
      const CategoryModel = (await import('@/models/Category')).default;
      const directCategory = await CategoryModel.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(safeCategory) ? [{ _id: safeCategory }] : []),
          { slug: safeCategory },
          { name: new RegExp(`^${escapeRegex(safeCategory)}$`, 'i') },
        ],
      }).lean();

      if (directCategory?._id) {
        query.Category = directCategory._id.toString();
      } else {
        return {
          items: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          hasMore: false,
          totalPages: 0,
          activeCategory: safeCategory,
          searchTerm: safeSearch,
          sort: safeSort,
        };
      }
    }
  }

  if (safeSearch) {
    const searchRegex = new RegExp(escapeRegex(safeSearch), 'i');
    const matchingCategories = await Category.find(
      {
        $or: [
          { name: searchRegex },
          { slug: searchRegex },
        ],
      },
      '_id',
    ).lean();

    const matchingCategoryIds = matchingCategories.map((entry) => entry._id);
    query.$or = [{ Name: searchRegex }];
    if (matchingCategoryIds.length > 0) {
      query.$or.push({ Category: { $in: matchingCategoryIds } });
    }
  }

  const sortQuery = (() => {
    if (safeSort === 'price-low') return { Price: 1, createdAt: -1 };
    if (safeSort === 'price-high') return { Price: -1, createdAt: -1 };
    if (safeSort === 'best-selling') return { isBestSelling: -1, createdAt: -1 };
    if (safeSort === 'featured') return { isFeatured: -1, featuredPriority: -1, createdAt: -1 };
    if (safeSort === 'deals') return { isDiscounted: -1, discountPercentage: -1, createdAt: -1 };
    if (safeSort === 'az') return { Name: 1, createdAt: -1 };
    if (safeSort === 'za') return { Name: -1, createdAt: -1 };
    return { createdAt: -1 };
  })();

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Product.find(query)
      .select(PRODUCT_CARD_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort(sortQuery)
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .then((products) => products.map(serializeProduct).map(toProductCardItem)),
    Product.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: skip + safeLimit < total,
    totalPages: Math.ceil(total / safeLimit),
    activeCategory: safeCategory,
    searchTerm: safeSearch,
    sort: safeSort,
    price,
  };
}

export async function getStorefrontTestimonials(limit = 10) {
  'use cache';
  cacheLife('foreverish');
  cacheTag('all-reviews', 'storefront-testimonials', 'home-page');

  await mongooseConnect();
  const Review = (await import('@/models/Review')).default;
  const safeLimit = Math.min(10, Math.max(1, Number(limit) || 10));

  const reviews = await Review.find({
    showOnHome: true,
    $or: [{ status: 'Approved' }, { isApproved: true }],
    comment: { $exists: true, $nin: [null, ''] },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(safeLimit)
    .populate({ path: 'productId', select: 'Name slug Images' })
    .lean();

  return reviews
    .map((review) => ({
      _id: review._id.toString(),
      userName: review.userName || 'Customer',
      rating: Number(review.rating || 5),
      comment: String(review.comment || '').trim(),
      productName: review.productId?.Name || '',
      productSlug: review.productId?.slug || review.productId?._id?.toString?.() || '',
      productImage: review.productId?.Images?.[0]?.url || '',
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : null,
    }))
    .filter((review) => review.comment.length > 0);
}

export async function getApprovedReviews(productId) {
  'use cache';
  cacheLife('foreverish');
  cacheTag(`reviews-${productId}`, 'all-reviews');

  const safeProductId = String(productId || '').trim();
  if (!safeProductId) return [];

  await mongooseConnect();
  const Review = (await import('@/models/Review')).default;

  // Cast to ObjectId when valid so Mongoose can use the indexed ObjectId field correctly
  const queryId = mongoose.Types.ObjectId.isValid(safeProductId)
    ? new mongoose.Types.ObjectId(safeProductId)
    : safeProductId;

  const reviews = await Review.find({ productId: queryId, isApproved: true })
    .sort({ createdAt: -1 })
    .lean();

  return reviews.map((review) => ({
    ...review,
    _id: review._id.toString(),
    productId: review.productId?.toString?.() || safeProductId,
    userId: review.userId?.toString?.() || null,
    createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : null,
    updatedAt: review.updatedAt ? new Date(review.updatedAt).toISOString() : null,
  }));
}

export async function getProductReviewSummary(productId) {
  'use cache';
  cacheLife('foreverish');
  cacheTag(`reviews-${productId}`);

  const safeProductId = String(productId || '').trim();
  if (!safeProductId) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  return measureDataAccess(`getProductReviewSummary(${safeProductId})`, async () => {
    await mongooseConnect();
    const Review = (await import('@/models/Review')).default;

    const queryId = mongoose.Types.ObjectId.isValid(safeProductId)
      ? new mongoose.Types.ObjectId(safeProductId)
      : safeProductId;

    const [summary] = await Review.aggregate([
      { $match: { productId: queryId, isApproved: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    return {
      averageRating: Number(summary?.averageRating || 0),
      reviewCount: Number(summary?.reviewCount || 0),
    };
  });
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFeedPrice(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} PKR`;
}

function getCatalogSiteUrl(siteUrlOverride = '') {
  const normalizedOverride = String(siteUrlOverride || '').trim();
  return normalizedOverride || getSiteUrl();
}

function buildCatalogFeedItem(product, siteUrl, storeName) {
  const productUrl = `${siteUrl}/products/${product.slug || product._id}`;
  const primaryImage = product.Images?.[0]?.url || `${siteUrl}/opengraph-image`;
  const additionalImages = product.Images?.slice(1).map((image) => image.url).filter(Boolean) || [];
  const categoryNames = getProductCategoryNames(product);
  const basePrice = Number(product.Price || 0);
  const salePrice = product.isDiscounted === true && product.discountedPrice != null
    ? Number(product.discountedPrice)
    : null;

  return {
    id: String(product._id),
    title: product.Name,
    description: stripHtml(product.Description || `Buy ${product.Name} from ${storeName}.`),
    availability: product.StockStatus === 'In Stock' ? 'in stock' : 'out of stock',
    condition: 'new',
    price: formatFeedPrice(basePrice),
    salePrice: salePrice != null ? formatFeedPrice(salePrice) : null,
    link: productUrl,
    imageLink: primaryImage,
    additionalImageLinks: additionalImages,
    brand: storeName,
    productType: categoryNames.join(' > '),
  };
}

export async function getProductBySlug(slug) {
  'use cache';
  cacheLife('hours');

  const safeSlug = String(slug || '').trim();
  if (!safeSlug) return null;

  let decodedSlug = safeSlug;
  try {
    decodedSlug = decodeURIComponent(safeSlug).trim();
  } catch {}
  const hyphenated = decodedSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

  cacheTag('products', `product-${safeSlug}`, `product-${decodedSlug}`, `product-${hyphenated}`);

  async function getSingleProduct(productSlug) {
    try {
      await mongooseConnect();
      
      const cleanSlug = String(productSlug || '').trim();
      let decoded = cleanSlug;
      try {
        decoded = decodeURIComponent(cleanSlug).trim();
      } catch {}

      const hyphenCandidate = decoded.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      const slugCandidates = Array.from(new Set([
        cleanSlug,
        cleanSlug.toLowerCase(),
        decoded,
        decoded.toLowerCase(),
        hyphenCandidate,
      ])).filter(Boolean);

      // 1. Try finding by slug candidates (vanity URL)
      let product = await Product.findOne({
        slug: { $in: slugCandidates },
        showOnStore: { $ne: false },
      })
        .select(PRODUCT_DETAIL_PROJECTION)
        .populate(PRODUCT_CATEGORY_POPULATE)
        .lean();
      
      // 2. If not found, try finding by Mongo _id
      if (!product) {
        for (const candidate of slugCandidates) {
          if (mongoose.Types.ObjectId.isValid(candidate) && candidate.length === 24) {
            try {
              product = await Product.findOne({
                _id: new mongoose.Types.ObjectId(candidate),
                showOnStore: { $ne: false },
              })
                .select(PRODUCT_DETAIL_PROJECTION)
                .populate(PRODUCT_CATEGORY_POPULATE)
                .lean();
              if (product) break;
            } catch {}
          }
        }
      }

      // 3. Fallback: case-insensitive slug regex search
      if (!product) {
        const escapedSlug = cleanSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        product = await Product.findOne({
          slug: { $regex: new RegExp(`^${escapedSlug}$`, 'i') },
          showOnStore: { $ne: false },
        })
          .select(PRODUCT_DETAIL_PROJECTION)
          .populate(PRODUCT_CATEGORY_POPULATE)
          .lean();
      }

      // 4. Fallback: match by product Name if raw name was in the URL
      if (!product && decoded.length > 2) {
        product = await Product.findOne({
          Name: { $regex: new RegExp(`^${decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          showOnStore: { $ne: false },
        })
          .select(PRODUCT_DETAIL_PROJECTION)
          .populate(PRODUCT_CATEGORY_POPULATE)
          .lean();
      }
      
      return product ? serializeProduct(product) : null;
    } catch (error) {
      console.error(`❌ [DATA] Error fetching product "${productSlug}":`, error.message);
      throw error;
    }
  }

  try {
    const product = await measureDataAccess(`getProductBySlug(${safeSlug})`, async () => getSingleProduct(safeSlug));
    return product ? toProductDetailView(product) : null;
  } catch (error) {
    console.error(`❌ [DATA] getProductBySlug failed for "${safeSlug}":`, error.message);
    throw error;
  }
}

export async function getProductPrerenderParams(limit = 1) {
  'use cache';
  cacheLife('hours');
  cacheTag('products');

  const safeLimit = Math.max(1, Number(limit) || 1);

  try {
    await mongooseConnect();
  const products = await Product.find({ showOnStore: true })
    .sort({ createdAt: -1 })
    .select('slug')
      .limit(safeLimit)
      .lean();

    const params = products
      .map((product) => String(product?.slug || '').trim())
      .filter(Boolean)
      .map((id) => ({ id }));

    return params.length > 0 ? params : [{ id: '__placeholder__' }];
  } catch (error) {
    console.error('❌ [DATA] getProductPrerenderParams failed:', error.message);
    return [{ id: '__placeholder__' }];
  }
}

export async function getRelatedProducts({ category = '', excludeSlug = '', limit = 8 } = {}) {
  const products = await getLiveProductsRaw();

  return products
    .filter((product) => product.slug !== excludeSlug)
    .filter((product) => {
      if (!category) return true;
      return hasProductCategory(product, category);
    })
    .slice(0, limit)
    .map(toProductCardItem);
}

export async function getCatalogFeed(siteUrlOverride = '') {
  'use cache';
  cacheLife('hours');
  cacheTag('products', 'settings', 'categories');

  try {
    return await measureDataAccess('getCatalogFeed', async () => {
      const siteUrl = getCatalogSiteUrl(siteUrlOverride);
      const [products, settings] = await Promise.all([
        getLiveProductsRaw(),
        getSettingsRaw(),
      ]);

      const items = products.map((product) => buildCatalogFeedItem(product, siteUrl, settings.storeName));

      return {
        generatedAt: new Date().toISOString(),
        storeName: settings.storeName,
        currency: 'PKR',
        items,
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('[BUILD] MongoDB connection failed while building catalog feed, returning an empty feed.');
      return {
        generatedAt: new Date().toISOString(),
        storeName: 'China Unique Store',
        currency: 'PKR',
        items: [],
      };
    }

    throw error;
  }
}

export async function getAdminProducts() {
  await mongooseConnect();
  const products = await Product.find({})
    .select(PRODUCT_ADMIN_PROJECTION)
    .populate(PRODUCT_CATEGORY_POPULATE)
    .sort({ createdAt: -1 })
    .lean();
  const serializedProducts = products.map(serializeProduct);
  return serializedProducts.map(toAdminProductRow);
}

export async function getAdminProductCategoryOptions() {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
  cacheTag('categories');

  const categories = await getCategoriesRaw();

  return categories.map((category) => ({
    _id: String(category._id || ''),
    id: String(category.id || ''),
    label: String(category.label || ''),
  }));
}

export async function getAdminOrderProductCatalog() {
  await mongooseConnect();

  const products = await Product.find({})
    .select([
      'Name',
      'Price',
      'Images',
      'Category',
      'slug',
      'discountedPrice',
      'isDiscounted',
    ].join(' '))
    .populate(PRODUCT_CATEGORY_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  return products.map((product) => {
    const serialized = serializeProduct(product);

    return {
      _id: serialized._id,
      slug: serialized.slug,
      Name: serialized.Name,
      Price: Number(serialized.Price || 0),
      discountedPrice:
        serialized.discountedPrice != null ? Number(serialized.discountedPrice) : null,
      isDiscounted: serialized.isDiscounted === true,
      Category: serialized.Category,
      Images: serialized.Images,
    };
  });
}

export async function getOrdersList() {
  await mongooseConnect();
  const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
  return orders.map(toOrderSummaryRow);
}

export async function getAdminProductsPage({
  search = '',
  status = 'all',
  stock = 'all',
  category = 'all',
  sort = 'newest',
  page = 1,
  limit = 12,
} = {}) {
  await mongooseConnect();

  const safeSearch = String(search || '').trim();
  const safeStatus = String(status || 'all').trim() || 'all';
  const safeStock = String(stock || 'all').trim() || 'all';
  const safeCategory = String(category || 'all').trim() || 'all';
  const safeSort = String(sort || 'newest').trim() || 'newest';
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 12);

  const query = {};

  if (safeStatus === 'live') query.showOnStore = true;
  if (safeStatus === 'draft') query.showOnStore = false;

  if (safeStock === 'in-stock') query.StockStatus = 'In Stock';
  if (safeStock === 'out-of-stock') query.StockStatus = { $ne: 'In Stock' };

  if (safeCategory === 'special-offers') {
    query.isDiscounted = true;
  } else if (safeCategory !== 'all') {
    const categories = await getCategoriesRaw();
    const matchedCategory = categories.find(
      (entry) => entry.id === safeCategory || entry._id === safeCategory,
    );

    if (!matchedCategory?._id) {
      return {
        items: [],
        total: 0,
        page: safePage,
        limit: safeLimit,
        totalPages: 0,
        hasMore: false,
        searchTerm: safeSearch,
        status: safeStatus,
        stock: safeStock,
        category: safeCategory,
        sort: safeSort,
        summary: {
          totalProducts: 0,
          liveProducts: 0,
          draftProducts: 0,
        },
      };
    }

    query.Category = matchedCategory._id;
  }

  if (safeSearch) {
    const searchRegex = new RegExp(escapeRegex(safeSearch), 'i');
    const matchingCategories = await Category.find(
      {
        $or: [{ name: searchRegex }, { slug: searchRegex }],
      },
      '_id',
    ).lean();

    const matchingCategoryIds = matchingCategories.map((entry) => entry._id);
    query.$or = [
      { Name: searchRegex },
      { 'vendors.name': searchRegex },
      { 'vendors.shopNumber': searchRegex },
    ];

    if (matchingCategoryIds.length > 0) {
      query.$or.push({ Category: { $in: matchingCategoryIds } });
    }

    if ('special offers'.includes(safeSearch.toLowerCase()) || 'special-offers'.includes(safeSearch.toLowerCase())) {
      query.$or.push({ isDiscounted: true });
    }
  }

  const sortQuery = (() => {
    if (safeSort === 'oldest') return { createdAt: 1 };
    if (safeSort === 'updated') return { updatedAt: -1, createdAt: -1 };
    if (safeSort === 'price-high') return { Price: -1, createdAt: -1 };
    if (safeSort === 'price-low') return { Price: 1, createdAt: -1 };
    if (safeSort === 'name') return { Name: 1, createdAt: -1 };
    return { createdAt: -1 };
  })();

  const skip = (safePage - 1) * safeLimit;

  const [items, total, totalProducts, liveProducts] = await Promise.all([
    Product.find(query)
      .select(PRODUCT_ADMIN_PROJECTION)
      .populate(PRODUCT_CATEGORY_POPULATE)
      .sort(sortQuery)
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .then((products) => products.map(serializeProduct).map(toAdminProductRow)),
    Product.countDocuments(query),
    Product.countDocuments(),
    Product.countDocuments({ showOnStore: true }),
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasMore: skip + safeLimit < total,
    searchTerm: safeSearch,
    status: safeStatus,
    stock: safeStock,
    category: safeCategory,
    sort: safeSort,
    summary: {
      totalProducts,
      liveProducts,
      draftProducts: Math.max(0, totalProducts - liveProducts),
    },
  };
}

export async function getAdminOrdersPage({
  search = '',
  status = DEFAULT_ORDER_STATUS,
  paymentFilter = 'all',
  startDate = '',
  endDate = '',
  page = 1,
  limit = 12,
} = {}) {
  'use cache';
  cacheLife({ stale: 15, revalidate: 30, expire: 120 });
  cacheTag('orders');
  await mongooseConnect();

  const safeSearch = String(search || '').trim();
  const safeStatus = normalizeOrderStatus(status || DEFAULT_ORDER_STATUS);
  const safePaymentFilter = String(paymentFilter || 'all').trim().toLowerCase();
  const safeStartDate = String(startDate || '').trim();
  const safeEndDate = String(endDate || '').trim();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 12));

  const query = { isDeleted: { $ne: true } };

  if (safeStatus === 'draft') {
    query.isDraft = true;
  } else if (safeStatus !== 'all') {
    query.isDraft = { $ne: true };
    query.status = getOrderStatusQueryValue(safeStatus);
  }

  if (safeStatus === 'Delivered') {
    if (safePaymentFilter === 'paid') {
      query.paymentStatus = 'Paid';
    } else if (safePaymentFilter === 'pending') {
      query.paymentStatus = { $ne: 'Paid' };
    }
  }

  if (safeSearch) {
    const searchRegex = new RegExp(escapeRegex(safeSearch), 'i');
    query.$or = [
      { orderId: searchRegex },
      { customerName: searchRegex },
      { customerPhone: searchRegex },
    ];
  }

  if (safeStartDate || safeEndDate) {
    query.createdAt = {};
    if (safeStartDate) {
      const start = new Date(safeStartDate);
      start.setHours(0, 0, 0, 0);
      query.createdAt.$gte = start;
    }
    if (safeEndDate) {
      const end = new Date(safeEndDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total, statusCounts, draftCount, trashCount, deliveredPaidCount] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean().then((orders) => orders.map(toOrderSummaryRow)),
    Order.countDocuments(query),
    Order.aggregate([
      {
        $match: {
          isDraft: { $ne: true },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.countDocuments({ isDraft: true, isDeleted: { $ne: true } }),
    Order.countDocuments({ isDeleted: true }),
    Order.countDocuments({ isDraft: { $ne: true }, isDeleted: { $ne: true }, status: 'Delivered', paymentStatus: 'Paid' }),
  ]);

  const statusCountMap = new Map(
    (Array.isArray(statusCounts) ? statusCounts : []).map((entry) => [String(entry?._id || ''), Number(entry?.count || 0)])
  );
  const summaryCounts = getOrderStatusSummaryCounts(statusCountMap);
  const deliveredTotal = summaryCounts.deliveredCount || 0;
  const deliveredPendingCount = Math.max(0, deliveredTotal - deliveredPaidCount);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasMore: skip + safeLimit < total,
    searchTerm: safeSearch,
    status: safeStatus,
    paymentFilter: safePaymentFilter,
    startDate: safeStartDate,
    endDate: safeEndDate,
    summary: {
      ...summaryCounts,
      draftCount,
      trashCount,
      deliveredPaidCount,
      deliveredPendingCount,
      allCount: summaryCounts.allCount + draftCount,
    },
  };
}

export async function getAdminTrashOrders() {
  'use cache';
  cacheLife({ stale: 15, revalidate: 30, expire: 120 });
  cacheTag('orders');
  await mongooseConnect();

  const items = await Order.find({ isDeleted: true })
    .sort({ deletedAt: -1 })
    .select('orderId customerName customerPhone totalAmount isDraft deletedAt createdAt')
    .limit(500)
    .lean();

  return items.map((o) => ({
    _id: String(o._id),
    orderId: o.orderId || '',
    customerName: o.customerName || '',
    customerPhone: o.customerPhone || '',
    totalAmount: Number(o.totalAmount || 0),
    isDraft: o.isDraft === true,
    deletedAt: o.deletedAt ? o.deletedAt.toISOString() : null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
  }));
}

export async function getAdminUsersPage({
  search = '',
  status = 'all',
  type = 'registered',
  page = 1,
  limit = 12,
} = {}) {
  await mongooseConnect();

  const safeSearch = String(search || '').trim();
  const safeStatus = String(status || 'all').trim() || 'all';
  const safeType = String(type || 'registered').trim() || 'registered';
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 12);
  const skip = (safePage - 1) * safeLimit;

  if (safeType === 'customers') {
    const [result] = await Order.aggregate(
      buildCustomerAggregationPipeline({
        search: safeSearch,
        skip,
        limit: safeLimit,
      }),
    );

    const items = Array.isArray(result?.items) ? result.items : [];
    const total = Number(result?.totalCount?.[0]?.count || 0);
    const summary = result?.summary?.[0] || {};

    return {
      items: items.map((customer) => ({
        ...customer,
        _id: String(customer._id || ''),
        email: customer.email || '',
        phone: customer.phone || '',
        city: customer.city || '',
        address: customer.address || '',
        landmark: customer.landmark || '',
        ordersCount: Number(customer.ordersCount || 0),
        totalSpent: Number(customer.totalSpent || 0),
        createdAt: customer.firstOrderAt?.toISOString?.() || null,
        updatedAt: customer.lastOrderAt?.toISOString?.() || null,
        customerType: 'customer',
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: skip + safeLimit < total,
      searchTerm: safeSearch,
      status: 'all',
      type: safeType,
      summary: {
        totalUsers: Number(summary.totalCustomers || 0),
        activeUsers: Number(summary.withPhone || 0),
        disabledUsers: Math.max(0, Number(summary.totalCustomers || 0) - Number(summary.withPhone || 0)),
        withEmail: Number(summary.withEmail || 0),
        withAddress: Number(summary.withAddress || 0),
      },
    };
  }

  const query = {};

  if (safeStatus === 'active') query.disabled = { $ne: true };
  if (safeStatus === 'disabled') query.disabled = true;

  if (safeSearch) {
    const searchRegex = new RegExp(escapeRegex(safeSearch), 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const [items, total, totalUsers, disabledUsers] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    User.countDocuments(query),
    User.countDocuments(),
    User.countDocuments({ disabled: true }),
  ]);

  return {
    items: items.map((user) => ({
      ...user,
      _id: user._id.toString(),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasMore: skip + safeLimit < total,
    searchTerm: safeSearch,
    status: safeStatus,
    type: safeType,
    summary: {
      totalUsers,
      disabledUsers,
      activeUsers: Math.max(0, totalUsers - disabledUsers),
    },
  };
}

export async function getAdminReviewsPage({
  search = '',
  page = 1,
  limit = 12,
} = {}) {
  await mongooseConnect();
  const Review = (await import('@/models/Review')).default;

  const safeSearch = String(search || '').trim();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 12);

  const query = {};

  if (safeSearch) {
    const searchRegex = new RegExp(escapeRegex(safeSearch), 'i');
    const matchedProducts = await Product.find(
      {
        $or: [{ Name: searchRegex }, { slug: searchRegex }],
      },
      '_id',
    ).lean();

    query.$or = [{ userName: searchRegex }, { comment: searchRegex }];

    if (matchedProducts.length > 0) {
      query.$or.push({ productId: { $in: matchedProducts.map((product) => product._id) } });
    }
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total, totalReviews, recentReviews, featuredReviews, ratings] = await Promise.all([
    Review.find(query)
      .populate('productId', 'Name slug Images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Review.countDocuments(query),
    Review.countDocuments(),
    Review.countDocuments({ createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    Review.countDocuments({ showOnHome: true }),
    Review.aggregate([{ $group: { _id: null, average: { $avg: '$rating' } } }]),
  ]);

  return {
    items: items.map((review) => ({
      ...review,
      _id: review._id.toString(),
      showOnHome: Boolean(review.showOnHome),
      productId: review.productId
        ? {
            ...review.productId,
            _id: review.productId._id.toString(),
          }
        : null,
      userId: review.userId ? review.userId.toString() : null,
      createdAt: review.createdAt?.toISOString(),
      updatedAt: review.updatedAt?.toISOString(),
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasMore: skip + safeLimit < total,
    searchTerm: safeSearch,
    summary: {
      totalReviews,
      recentReviews,
      featuredReviews,
      averageRating: Number(ratings[0]?.average || 0),
    },
  };
}

export async function getUserOrders(email) {
  if (!email) return [];
  await mongooseConnect();
  
  const normalizedEmail = normalizeEmail(email);

  // 1. Fetch user to see if they have a phone number linked
  const user = await User.findOne({ email: normalizedEmail }).lean();
  
  // 2. Build query: match by customerEmail OR by customerPhone if phone exists (fuzzy)
  const query = {
    isDraft: { $ne: true },
    $or: [
      { customerEmail: normalizedEmail }
    ]
  };

  if (user?.phone) {
    const phoneRegex = getPhoneRegex(user.phone);
    if (phoneRegex) {
      query.$or.push({ customerPhone: { $regex: phoneRegex } });
    }
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
  return orders.map(toOrderSummaryRow);
}

export async function getOrderById(id) {
  await mongooseConnect();
  const order = await Order.findById(String(id || '')).lean();
  if (!order) return null;

  const productIdentifiers = Array.from(
    new Set(
      (Array.isArray(order.items) ? order.items : [])
        .map((item) => String(item?.productId || '').trim())
        .filter(Boolean)
    )
  );

  let productLookup = new Map();
  if (productIdentifiers.length > 0) {
    const objectIds = productIdentifiers.filter((value) => mongoose.Types.ObjectId.isValid(value));
    const products = await Product.find({
      $or: [
        { slug: { $in: productIdentifiers } },
        ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
      ],
    })
      .select('slug vendors')
      .lean();

    productLookup = new Map();
    products.forEach((product) => {
      const normalizedVendors = Array.isArray(product.vendors)
        ? product.vendors.map(normalizeVendorSnapshot).filter(Boolean)
        : [];

      productLookup.set(product._id.toString(), normalizedVendors);
      if (product.slug) {
        productLookup.set(String(product.slug), normalizedVendors);
      }
    });
  }

  const normalizedOrder = toOrderSummaryRow(order);
  normalizedOrder.items = normalizedOrder.items.map((item) => ({
    ...item,
    sourcingVendors:
      Array.isArray(item.sourcingVendors) && item.sourcingVendors.length > 0
        ? item.sourcingVendors
        : productLookup.get(String(item.productId || '').trim()) || [],
  }));

  return normalizedOrder;
}

export async function getOrderLogs(orderId) {
  await mongooseConnect();
  const normalizedOrderId = mongoose.Types.ObjectId.isValid(String(orderId || ''))
    ? new mongoose.Types.ObjectId(String(orderId))
    : String(orderId || '');

  const logs = await OrderLog.find({ orderId: normalizedOrderId })
    .sort({ createdAt: -1 })
    .lean();
  
  return logs.map(log => ({
    ...log,
    _id: log._id.toString(),
    orderId: log.orderId.toString(),
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function getCustomerOtherOrders(phone, currentOrderId) {
  if (!phone || String(phone).trim().length < 6) return [];
  await mongooseConnect();

  const rawPhone = String(phone).trim();
  const digits = rawPhone.replace(/\D/g, '').slice(-9);
  if (!digits) return [];

  const query = {
    isDeleted: { $ne: true },
    customerPhone: { $regex: digits, $options: 'i' },
  };

  if (currentOrderId && mongoose.Types.ObjectId.isValid(String(currentOrderId))) {
    query._id = { $ne: new mongoose.Types.ObjectId(String(currentOrderId)) };
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(10).lean();
  return orders.map(toOrderSummaryRow);
}

export async function getAdminDashboardData() {
  'use cache';
  cacheLife({ stale: 15, revalidate: 30, expire: 120 });
  cacheTag('admin-dashboard', 'orders', 'products');
  await mongooseConnect();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [orderDashboardAgg, productDashboardAgg, recentReviewsAgg] = await Promise.all([
    Order.aggregate([
      {
        $facet: {
          draftCount: [
            { $match: { isDraft: true, isDeleted: { $ne: true } } },
            { $count: 'count' },
          ],
          confirmedCount: [
            { $match: { isDraft: { $ne: true }, isDeleted: { $ne: true }, status: { $in: ['Order Confirmed', 'Confirmed', 'Pending'] } } },
            { $count: 'count' },
          ],
          shippedCount: [
            { $match: { isDraft: { $ne: true }, isDeleted: { $ne: true }, status: 'Shipped' } },
            { $count: 'count' },
          ],
          outForDeliveryCount: [
            { $match: { isDraft: { $ne: true }, isDeleted: { $ne: true }, status: { $in: ['Out For Delivery', 'Out for Delivery'] } } },
            { $count: 'count' },
          ],
          totals: [
            {
              $match: {
                isDraft: { $ne: true },
              },
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                pendingOrders: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['Order Confirmed', 'Confirmed', 'Pending']] }, 1, 0],
                  },
                },
                totalRevenue: { $sum: '$totalAmount' },
              },
            },
          ],
          customers: [
            {
              $match: {
                isDraft: { $ne: true },
              },
            },
            {
              $group: {
                _id: {
                  $cond: [
                    { $ne: [{ $ifNull: ['$customerEmail', ''] }, ''] },
                    { $ifNull: ['$customerEmail', ''] },
                    {
                      $cond: [
                        { $ne: [{ $ifNull: ['$customerPhone', ''] }, ''] },
                        { $ifNull: ['$customerPhone', ''] },
                        { $toString: '$_id' },
                      ],
                    },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          recentOrders: [
            {
              $match: {
                isDraft: { $ne: true },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
          ],
          dailyConfirmedOrders: [
            {
              $match: {
                isDraft: { $ne: true },
                status: { $in: ['Order Confirmed', 'Confirmed', 'Pending'] },
                createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
              },
            },
            { $count: 'count' },
          ],
          topProducts: [
            {
              $match: {
                isDraft: { $ne: true },
              },
            },
            { $unwind: '$items' },
            {
              $match: {
                'items.productId': { $ne: 'unknown-default' },
                'items.name': { $ne: 'Unknown item' },
              },
            },
            {
              $group: {
                _id: '$items.productId',
                name: { $first: '$items.name' },
                image: { $first: '$items.image' },
                totalSold: { $sum: '$items.quantity' },
              },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
          ],
          topCustomers: [
            {
              $match: {
                isDraft: { $ne: true },
              },
            },
            {
              $group: {
                _id: {
                  $cond: [
                    { $ne: [{ $ifNull: ['$customerPhone', ''] }, ''] },
                    { $ifNull: ['$customerPhone', ''] },
                    {
                      $cond: [
                        { $ne: [{ $ifNull: ['$customerEmail', ''] }, ''] },
                        { $ifNull: ['$customerEmail', ''] },
                        { $toString: '$_id' },
                      ],
                    },
                  ],
                },
                name: { $first: '$customerName' },
                phone: { $first: '$customerPhone' },
                email: { $first: '$customerEmail' },
                totalSpent: { $sum: '$totalAmount' },
                ordersCount: { $sum: 1 },
              },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]),
    Product.aggregate([
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                liveProducts: {
                  $sum: {
                    $cond: [{ $eq: ['$showOnStore', true] }, 1, 0],
                  },
                },
              },
            },
          ],
          topVendors: [
            { $match: { showOnStore: true, vendors: { $exists: true, $ne: [] } } },
            { $unwind: '$vendors' },
            {
              $group: {
                _id: {
                  vendorId: '$vendors.vendorId',
                  name: '$vendors.name',
                  shopNumber: '$vendors.shopNumber',
                },
                totalLiveItems: { $sum: 1 },
              },
            },
            { $sort: { totalLiveItems: -1, '_id.name': 1 } },
            { $limit: 5 },
          ],
        },
      },
    ]),
    Review.find().sort({ createdAt: -1 }).limit(5).populate('productId', 'Name images').lean()
  ]);

  const orderDashboard = orderDashboardAgg?.[0] || {};
  const productDashboard = productDashboardAgg?.[0] || {};
  const totals = orderDashboard.totals?.[0] || {};
  const productCounts = productDashboard.counts?.[0] || {};
  const recentOrders = Array.isArray(orderDashboard.recentOrders) ? orderDashboard.recentOrders : [];
  const topVendorsAgg = Array.isArray(productDashboard.topVendors) ? productDashboard.topVendors : [];

  return {
    summary: {
      totalOrders: Number(totals.totalOrders || 0),
      pendingOrders: Number(totals.pendingOrders || 0),
      totalProducts: Number(productCounts.totalProducts || 0),
      liveProducts: Number(productCounts.liveProducts || 0),
      totalRevenue: Number(totals.totalRevenue || 0),
      totalCustomers: Number(orderDashboard.customers?.[0]?.count || 0),
      dailyConfirmedOrders: Number(orderDashboard.dailyConfirmedOrders?.[0]?.count || 0),
      draftOrders: Number(orderDashboard.draftCount?.[0]?.count || 0),
      confirmedOrders: Number(orderDashboard.confirmedCount?.[0]?.count || 0),
      shippedOrders: Number(orderDashboard.shippedCount?.[0]?.count || 0),
      outForDeliveryOrders: Number(orderDashboard.outForDeliveryCount?.[0]?.count || 0),
    },
    recentOrders: recentOrders.map(toOrderSummaryRow),
    topProducts: Array.isArray(orderDashboard.topProducts) ? orderDashboard.topProducts : [],
    topVendors: topVendorsAgg.map((entry) => ({
      vendorId: entry?._id?.vendorId?.toString?.() || '',
      name: String(entry?._id?.name || '').trim(),
      shopNumber: String(entry?._id?.shopNumber || '').trim(),
      totalLiveItems: Number(entry?.totalLiveItems || 0),
    })).filter((entry) => entry.name),
    topCustomers: Array.isArray(orderDashboard.topCustomers) ? orderDashboard.topCustomers : [],
    recentReviews: (recentReviewsAgg || []).map(r => ({
      _id: r._id?.toString(),
      rating: r.rating,
      comment: r.comment,
      userName: r.userName,
      createdAt: r.createdAt?.toISOString(),
      productName: r.productId?.Name || 'Unknown Product',
      productImage: r.productId?.images?.[0] || null,
      productId: r.productId?._id?.toString() || null,
    })),
  };
}

export async function getAdminChartData(period = 'monthly') {
  'use cache';
  cacheLife({ stale: 20, revalidate: 45, expire: 180 });
  cacheTag('admin-dashboard', 'orders');
  await mongooseConnect();

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const safePeriod = ['weekly', 'monthly', 'yearly'].includes(String(period)) ? String(period) : 'monthly';
  const startDate = new Date(now);
  const labels = [];
  let groupByFormat = '%Y-%m-%d';

  if (safePeriod === 'weekly') {
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(d.toISOString().split('T')[0]);
    }
  } else if (safePeriod === 'yearly') {
    startDate.setMonth(now.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    groupByFormat = '%Y-%m';
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  } else {
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(d.toISOString().split('T')[0]);
    }
  }

  const results = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: groupByFormat, date: '$createdAt' },
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dataMap = new Map(
    (Array.isArray(results) ? results : []).map((row) => [row._id, { revenue: Number(row.revenue || 0), orders: Number(row.orders || 0) }])
  );

  return labels.map((dateLabel) => {
    const data = dataMap.get(dateLabel) || { revenue: 0, orders: 0 };
    let displayLabel = dateLabel;

    if (safePeriod === 'weekly') {
      displayLabel = new Date(dateLabel).toLocaleDateString('en-US', { weekday: 'short' });
    } else if (safePeriod === 'monthly') {
      displayLabel = new Date(dateLabel).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (safePeriod === 'yearly') {
      const [year, month] = dateLabel.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    return {
      rawDate: dateLabel,
      date: displayLabel,
      revenue: data.revenue,
      orders: data.orders,
    };
  });
}

export async function getAdminSettings() {
  'use cache';
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag('settings');
  await mongooseConnect();

  let settings = await Settings.findOne({ singletonKey: SETTINGS_KEY }).lean();
  if (!settings) {
    settings = await Settings.create({ singletonKey: SETTINGS_KEY });
    settings = settings.toObject();
  }

  return {
    _id: settings._id.toString(),
    storeName: settings.storeName || 'China Unique Store',
    supportEmail: settings.supportEmail || '',
    businessAddress: settings.businessAddress || '',
    lightLogoUrl: normalizeLogoUrl(settings.lightLogoUrl),
    darkLogoUrl: normalizeLogoUrl(settings.darkLogoUrl),
    faviconSizePx: normalizeFaviconSize(settings.faviconSizePx),
    faviconUrl: normalizeFaviconUrl(settings.faviconUrl, settings.faviconSizePx),
    logoScalePercent: Math.min(200, Math.max(60, Number(settings.logoScalePercent || 100))),
    emailLogoScalePercent: Math.min(200, Math.max(40, Number(settings.emailLogoScalePercent || 100))),
    invoiceLogoScalePercent: Math.min(200, Math.max(40, Number(settings.invoiceLogoScalePercent || 100))),
    whatsappNumber: settings.whatsappNumber || '',
    facebookPageUrl: settings.facebookPageUrl || '',
    instagramUrl: settings.instagramUrl || '',
    trackingEnabled: settings.trackingEnabled === true,
    facebookPixelId: settings.facebookPixelId || '',
    facebookConversionsApiToken: settings.facebookConversionsApiToken || '',
    facebookTestEventCode: settings.facebookTestEventCode || '',
    tiktokPixelId: settings.tiktokPixelId || '',
    tiktokAccessToken: settings.tiktokAccessToken || '',
    karachiDeliveryFee: Number(settings.karachiDeliveryFee || 200),
    outsideKarachiDeliveryFee: Number(settings.outsideKarachiDeliveryFee || 300),
    freeShippingThreshold: Number(settings.freeShippingThreshold || 5000),
    announcementBarEnabled: settings.announcementBarEnabled ?? true,
    announcementBarText: settings.announcementBarText || '',
    announcementBarMessages: normalizeAnnouncementMessages(settings.announcementBarMessages, settings.announcementBarText),
    homepageSectionOrder: Array.isArray(settings.homepageSectionOrder) ? settings.homepageSectionOrder : [],
    customPages: mergeCustomPages(settings.customPages),
    enableSecondaryNoc: settings.enableSecondaryNoc === true,
  };
}

export async function getAdminTopProductsPage({ page = 1, limit = 20 } = {}) {
  'use cache';
  cacheLife({ stale: 20, revalidate: 45, expire: 180 });
  cacheTag('orders', 'products');
  await mongooseConnect();

  const skip = (Math.max(1, Number(page)) - 1) * limit;
  const limitNumber = Math.max(1, Number(limit));

  const [aggregationResult] = await Order.aggregate([
    { $unwind: '$items' },
    {
      $match: {
        'items.productId': { $ne: 'unknown-default' },
        'items.name': { $ne: 'Unknown item' },
      },
    },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      },
    },
    {
      $facet: {
        items: [
          { $sort: { totalSold: -1 } },
          { $skip: skip },
          { $limit: limitNumber },
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  const items = aggregationResult?.items || [];
  const total = aggregationResult?.totalCount?.[0]?.count || 0;

  if (items.length > 0) {
    const productIds = items.map(item => item._id);
    const objectIds = [];
    const slugs = [];
    for (const id of productIds) {
      if (id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
        objectIds.push(id);
      } else if (id) {
        slugs.push(id);
      }
    }
    
    const query = [];
    if (objectIds.length > 0) query.push({ _id: { $in: objectIds } });
    if (slugs.length > 0) query.push({ slug: { $in: slugs } });

    const products = query.length > 0 
      ? await Product.find({ $or: query }).select('showOnStore StockStatus Price slug').lean() 
      : [];
      
    const productMap = products.reduce((acc, p) => {
      acc[p._id.toString()] = p;
      if (p.slug) acc[p.slug] = p;
      return acc;
    }, {});

    for (const item of items) {
      const p = productMap[item._id?.toString()];
      item.showOnStore = p ? p.showOnStore : false;
      item.StockStatus = p ? p.StockStatus : 'Unknown';
      item.currentPrice = p ? p.Price : 0;
      item.actualProductId = p ? p._id.toString() : item._id?.toString();
    }
  }

  return {
    items: items.map(item => ({
      ...item,
      _id: item._id?.toString()
    })),
    total,
    page: Math.max(1, Number(page)),
    limit: limitNumber,
    totalPages: Math.ceil(total / limitNumber),
  };
}

export async function getAdminStockRequests({ page = 1, limit = 20, status = 'all', productSearch = '' } = {}) {
  await mongooseConnect();
  const StockRequest = (await import('@/models/StockRequest')).default;
  
  const query = {};
  if (status !== 'all') {
    query.status = status;
  }
  if (productSearch) {
    query.productName = { $regex: productSearch, $options: 'i' };
  }
  
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const skip = (safePage - 1) * safeLimit;
  
  const [items, total] = await Promise.all([
    StockRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    StockRequest.countDocuments(query),
  ]);
  
  return {
    items: items.map(item => ({
      ...item,
      _id: item._id.toString(),
      productId: item.productId?.toString(),
      createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}


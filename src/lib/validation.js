import { z } from 'zod';

// Shared base fields
const nameSchema = z.string().trim().max(100, 'Name is too long');
const phoneSchema = z.string().trim().max(20, 'Phone number is too long');
const addressSchema = z.string().trim().max(500, 'Address is too long');
const citySchema = z.string().trim().max(100, 'City name is too long');
const landmarkSchema = z.string().trim().max(200, 'Landmark is too long').optional().or(z.literal(''));
const emailSchema = z.string().trim().email('Invalid email address').max(100).optional().or(z.literal(''));
const notesSchema = z.string().trim().max(1000, 'Notes are too long').optional().or(z.literal(''));
const urlSchema = z.string().trim().url('Invalid URL').max(500).optional().or(z.literal(''));

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required').max(500),
  slug: z.string().max(500).optional(),
  packLabel: z.string().max(200).optional(),
  quantity: z.number().int().positive('Quantity must be positive').default(1),
  price: z.number().nonnegative('Price cannot be negative').optional(),
  name: z.string().max(500).optional(),
  image: z.string().max(2000).optional(),
  vendor: z.string().max(300).optional(),
});

export const submitOrderSchema = z.object({
  idempotencyKey: z.string().trim().max(100).optional().or(z.literal('')),
  customerName: nameSchema.min(1, 'Name is required'),
  customerPhone: phoneSchema.min(10, 'Valid phone number is required'),
  customerAddress: addressSchema.min(1, 'Address is required'),
  customerCity: citySchema.min(1, 'City is required'),
  landmark: landmarkSchema,
  customerEmail: emailSchema,
  notes: notesSchema,
  whatsappNumber: phoneSchema.optional().or(z.literal('')),
  couponCode: z.string().trim().max(50).optional().or(z.literal('')),
  totalAmount: z.number().positive('Total amount must be greater than zero'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export const draftOrderSchema = z.object({
  customerName: nameSchema.min(1, 'Name is required'),
  customerPhone: phoneSchema.optional().or(z.literal('')),
  customerAddress: addressSchema.optional().or(z.literal('')),
  customerCity: citySchema.optional().or(z.literal('')),
  landmark: landmarkSchema,
  customerEmail: emailSchema,
  notes: notesSchema,
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  sourceTag: z.string().trim().max(50).optional().or(z.literal('')),
  orderType: z.enum(['Online', 'Admin']).optional(),
  itemType: z.string().trim().max(50).optional().or(z.literal('')),
  weight: z.coerce.number().nonnegative().optional(),
  manualCodAmount: z.union([z.coerce.number().nonnegative(), z.literal('')]).optional(),
  createLinkedInvoice: z.boolean().optional(),
});

export const updateOrderSchema = draftOrderSchema.partial().extend({
  trackingNumber: z.string().trim().max(100).optional().or(z.literal('')),
  nocThirdPartyNo: z.string().trim().max(100).optional().or(z.literal('')),
  nocParcelNo: z.string().trim().max(100).optional().or(z.literal('')),
  courierName: z.string().trim().max(100).optional().or(z.literal('')),
  status: z.string().trim().max(50).optional(),
  orderQuantity: z.coerce.number().int().nonnegative().optional(),
});

export const trackGuestOrderSchema = z.object({
  orderId: z.string().trim().min(1, 'Order ID is required').max(50),
  phone: phoneSchema.min(10, 'Valid phone number is required'),
});

export const linkOrdersSchema = z.object({
  phone: phoneSchema.min(10, 'Valid phone number is required'),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().max(100).optional(),
  supportEmail: emailSchema,
  businessAddress: addressSchema.optional(),
  whatsappNumber: phoneSchema.optional(),
  facebookPageUrl: urlSchema,
  instagramUrl: urlSchema,
  trackingEnabled: z.boolean().optional(),
  facebookPixelId: z.string().trim().max(100).optional().or(z.literal('')),
  facebookConversionsApiToken: z.string().trim().max(500).optional().or(z.literal('')),
  facebookTestEventCode: z.string().trim().max(100).optional().or(z.literal('')),
  tiktokPixelId: z.string().trim().max(100).optional().or(z.literal('')),
  tiktokAccessToken: z.string().trim().max(500).optional().or(z.literal('')),
  karachiDeliveryFee: z.coerce.number().nonnegative().optional(),
  outsideKarachiDeliveryFee: z.coerce.number().nonnegative().optional(),
  freeShippingThreshold: z.coerce.number().nonnegative().optional(),
  announcementBarEnabled: z.boolean().optional(),
  announcementBarText: z.string().trim().max(200).optional().or(z.literal('')),
  enableSecondaryNoc: z.boolean().optional(),
  // allow flexible arbitrary fields for customPages and coverImages since they have custom normalizers
  coverImages: z.any().optional(),
  customPages: z.any().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required').max(500),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(2000, 'Comment is too long').optional().or(z.literal('')),
  images: z.array(urlSchema).max(5, 'Maximum images allowed').optional(),
});

export const userProfileSchema = z.object({
  name: nameSchema.min(1, 'Name is required'),
  phone: phoneSchema.optional().or(z.literal('')),
  city: citySchema.optional().or(z.literal('')),
  address: addressSchema.optional().or(z.literal('')),
  landmark: landmarkSchema,
});

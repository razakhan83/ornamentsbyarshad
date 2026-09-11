/**
 * Database Seed Script for "Ornaments by Arshad" Luxury Jewelry Store
 * Seeds luxury jewelry categories, realistic fine jewelry pieces with multiple gallery images,
 * and default store settings.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load environment variables from .env.local if not already defined
if (!process.env.MONGODB_URI) {
  const envPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment or .env.local');
  process.exit(1);
}

// Schemas for Seeding
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ProductImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    blurDataURL: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true },
    Description: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    seoKeywords: { type: String, default: '' },
    Price: { type: Number, required: true },
    compareAtPrice: { type: Number, default: null },
    Images: { type: [ProductImageSchema], default: [] },
    Category: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    metalType: { type: String, default: '' },
    purity: { type: String, default: '' },
    size: { type: String, default: '' },
    availableSizes: { type: [String], default: [] },
    availableColors: { type: [String], default: [] },
    gemstone: {
      cut: { type: String, default: '' },
      carat: { type: Number, default: null },
      clarity: { type: String, default: '' },
      color: { type: String, default: '' },
      gemstoneType: { type: String, default: '' },
    },
    grossWeightGrams: { type: Number, default: null },
    certificateNumber: { type: String, default: '' },
    stockQuantity: { type: Number, default: 5 },
    StockStatus: { type: String, default: 'In Stock' },
    slug: { type: String, unique: true },
    showOnStore: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    featuredPriority: { type: Number, default: 0 },
    isNewArrival: { type: Boolean, default: false },
    isBestSelling: { type: Boolean, default: false },
    isFreeDelivery: { type: Boolean, default: true },
    rating: { type: Number, default: 5 },
    reviewCount: { type: Number, default: 30 },
    tags: { type: [String], default: [] },
    primaryTag: { type: String, default: '' },
  },
  { timestamps: true }
);

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, default: '' },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  },
  { timestamps: true }
);

const AnnouncementMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const SettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: 'site-settings', unique: true },
    storeName: { type: String, default: 'Ornaments by Arshad' },
    supportEmail: { type: String, default: 'concierge@ornamentsbyarshad.com' },
    businessAddress: { type: String, default: 'Luxury Jewelry Galleria, Karachi, Pakistan' },
    whatsappNumber: { type: String, default: '923001234567' },
    facebookPageUrl: { type: String, default: 'https://www.facebook.com/ornamentsbyarshad' },
    instagramUrl: { type: String, default: 'https://www.instagram.com/ornamentsbyarshad' },
    karachiDeliveryFee: { type: Number, default: 0 },
    outsideKarachiDeliveryFee: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },
    announcementBarEnabled: { type: Boolean, default: true },
    announcementBarText: { type: String, default: '✨ Complimentary Insured Delivery on All Fine Jewelry Orders ✨' },
    announcementBarMessages: { type: [AnnouncementMessageSchema], default: [] },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

async function seed() {
  console.log('💎 Connecting to isolated database...');
  await mongoose.connect(MONGODB_URI);
  console.log(' Connected to MongoDB.');

  console.log('🧹 Clearing legacy collections...');
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Review.deleteMany({});
  await Settings.deleteMany({});

  console.log('✨ Seeding luxury categories...');
  const categoriesData = [
    {
      name: 'Necklace Sets',
      slug: 'necklace-sets',
      description: 'Regal bridal chokers, handcrafted kundan necklaces, and fine gemstone sets.',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Bracelets',
      slug: 'bracelets',
      description: 'Artisanal kadas, delicate tennis bracelets, and luxury gold leaf cuffs.',
      image: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Diamond Rings',
      slug: 'diamond-rings',
      description: 'Solitaire, halo, and eternity diamond rings crafted in 18K solid gold.',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Earrings',
      slug: 'earrings',
      description: 'Chandelier drops, diamond studs, and heritage bridal jhumkas.',
      image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      sortOrder: 4,
      isActive: true,
    },
    {
      name: 'Bridal Sets',
      slug: 'bridal-sets',
      description: 'Comprehensive heirloom bridal jewelry suites with uncut polki and diamonds.',
      image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
      sortOrder: 5,
      isActive: true,
    },
  ];

  const createdCategories = await Category.insertMany(categoriesData);
  const catMap = {};
  createdCategories.forEach((c) => {
    catMap[c.slug] = c._id;
  });
  console.log(` Created ${createdCategories.length} luxury categories.`);

  console.log('✨ Seeding fine jewelry pieces with multi-image photography...');
  const productsData = [
    // ── NECKLACE SETS ──
    {
      Name: 'Jade Blossom Drop Necklace Set',
      slug: 'jade-blossom-drop-necklace-set',
      Description:
        'A magnificent handcrafted bridal necklace set adorned with certified emerald green drops, lustrous freshwater seed pearls, and intricate 22K gold vermeil filigree. Includes matching chandelier drop earrings.',
      shortDescription: 'Handcrafted emerald drop & pearl necklace set with matching earrings.',
      seoTitle: 'Jade Blossom Drop Necklace Set | Ornaments by Arshad',
      seoDescription: 'Handcrafted emerald drop necklace set with 22K gold finish and matching chandelier earrings.',
      Price: 24500,
      compareAtPrice: 28000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['necklace-sets']],
      metalType: '22K Gold Vermeil',
      purity: '22K',
      availableColors: ['Golden Ruby', 'Golden Green', 'Golden Ruby & Green', 'Golden Pearl'],
      grossWeightGrams: 48.5,
      certificateNumber: 'OBA-NECK-101',
      stockQuantity: 4,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      featuredPriority: 10,
      isBestSelling: true,
      rating: 5,
      reviewCount: 30,
      tags: ['necklace-set', 'bridal', 'emerald', 'bestseller'],
    },
    {
      Name: 'Chic Kundan Medallion Necklace Set',
      slug: 'chic-kundan-medallion-necklace-set',
      Description:
        'Traditional uncut kundan stones set in 22K gold plate with suspended cluster pearls and matching statement jhumkas. An opulent piece for weddings and royal celebrations.',
      shortDescription: 'Uncut kundan medallion choker necklace with matching earrings.',
      Price: 28500,
      compareAtPrice: 32000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['necklace-sets']],
      metalType: '22K Gold Vermeil',
      purity: '22K',
      availableColors: ['Golden Ruby', 'Golden Emerald', 'Golden Multi'],
      stockQuantity: 2,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      isBestSelling: true,
      rating: 5,
      reviewCount: 42,
      tags: ['kundan', 'bridal', 'bestseller'],
    },
    {
      Name: 'Refined Kundan Pearls Necklace Set',
      slug: 'refined-kundan-pearls-necklace-set',
      Description:
        'A graceful heritage necklace crafted with double rows of natural pearls and hand-set champagne crystals in rich antique gold plating.',
      shortDescription: 'Double-row natural pearl and champagne crystal choker set.',
      Price: 22000,
      compareAtPrice: 25000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['necklace-sets']],
      metalType: '18K Gold Plated',
      purity: '18K',
      availableColors: ['Golden Pearl', 'Golden Ruby'],
      stockQuantity: 5,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      rating: 4.9,
      reviewCount: 18,
      tags: ['pearls', 'necklace-set'],
    },
    {
      Name: 'Royal Emerald Polki Choker',
      slug: 'royal-emerald-polki-choker',
      Description:
        'A timeless polki choker accented with deep green Colombian emerald cabochons and layered pearl strings.',
      shortDescription: 'Polki and emerald bridal choker with adjustable dori string.',
      Price: 34000,
      compareAtPrice: 39000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['necklace-sets']],
      metalType: '22K Gold Vermeil',
      stockQuantity: 3,
      StockStatus: 'In Stock',
      showOnStore: true,
      isBestSelling: true,
      rating: 5,
      reviewCount: 25,
      tags: ['choker', 'polki', 'emerald'],
    },

    // ── BRACELETS ──
    {
      Name: 'Shard Medusa Head Bracelet',
      slug: 'shard-medusa-head-bracelet',
      Description:
        'A statement luxury cuff bracelet crafted with a central medallion emblem surrounded by pavé brilliant stones and micro-mesh gold band.',
      shortDescription: 'Iconic gold cuff bracelet with embossed medallion center.',
      Price: 7850,
      compareAtPrice: 9500,
      Images: [
        { url: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['bracelets']],
      metalType: '18K Gold Plated Stainless Steel',
      purity: '18K',
      availableSizes: ['Standard', 'Small', 'Large'],
      availableColors: ['Yellow Gold', 'Rose Gold', 'Silver'],
      stockQuantity: 6,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      isBestSelling: true,
      rating: 5,
      reviewCount: 19,
      tags: ['bracelet', 'cuff', 'bestseller'],
    },
    {
      Name: 'Leaf Vine Stainless Steel Bracelet',
      slug: 'leaf-vine-stainless-steel-bracelet',
      Description:
        'Delicate laser-cut filigree vine bangle crafted from anti-tarnish stainless steel dipped in 18K yellow and white gold.',
      shortDescription: 'Anti-tarnish dual-tone leaf vine engraved bangle.',
      Price: 4800,
      compareAtPrice: 6000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['bracelets']],
      metalType: '18K Gold Plated',
      stockQuantity: 8,
      StockStatus: 'In Stock',
      showOnStore: true,
      isBestSelling: true,
      rating: 4.8,
      reviewCount: 40,
      tags: ['bracelet', 'vine', 'anti-tarnish'],
    },
    {
      Name: 'Tree Life Pearl Finger Bracelet',
      slug: 'tree-life-pearl-finger-bracelet',
      Description:
        'Traditional Hathphool finger ring bracelet adorned with Tree of Life medallions and freshwater pearls.',
      shortDescription: 'Handcrafted Tree of Life Hathphool with pearls.',
      Price: 6500,
      compareAtPrice: 7800,
      Images: [
        { url: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['bracelets']],
      metalType: '18K Gold Vermeil',
      stockQuantity: 4,
      StockStatus: 'In Stock',
      showOnStore: true,
      rating: 5,
      reviewCount: 14,
      tags: ['hathphool', 'pearl-bracelet'],
    },
    {
      Name: 'Solitaire Diamond Tennis Bracelet',
      slug: 'solitaire-diamond-tennis-bracelet',
      Description:
        'Continuous row of bezel-set round brilliant simulated diamonds mounted in lustrous white and yellow gold.',
      shortDescription: 'Continuous 4-prong diamond tennis bracelet.',
      Price: 12500,
      compareAtPrice: 15000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['bracelets']],
      metalType: '18K White Gold',
      stockQuantity: 5,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      rating: 5,
      reviewCount: 32,
      tags: ['tennis-bracelet', 'diamond'],
    },

    // ── DIAMOND RINGS ──
    {
      Name: 'The Royal Solitaire Diamond Ring (1.50 Ct)',
      slug: 'royal-solitaire-diamond-ring-1-50-ct',
      Description:
        'A breathtaking six-prong solitaire ring featuring a certified 1.50-carat round brilliant cut diamond mounted in lustrous 18K White Gold.',
      shortDescription: 'Certified 1.50-carat round brilliant diamond in 18K White Gold.',
      Price: 85000,
      compareAtPrice: 95000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['diamond-rings']],
      metalType: '18K White Gold',
      purity: '18K',
      availableSizes: ['6', '6.5', '7', '7.5', '8'],
      stockQuantity: 3,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      rating: 5,
      reviewCount: 28,
      tags: ['solitaire', 'diamond-ring', 'bestseller'],
    },
    {
      Name: 'Empress Halo Emerald Cut Ring',
      slug: 'empress-halo-emerald-cut-ring',
      Description:
        'A regal 2.0-carat emerald-cut center stone wrapped in a halo of pavé brilliant diamonds on an 18K yellow gold band.',
      shortDescription: '2.0 Ct Emerald cut diamond ring with halo pavé surround.',
      Price: 92000,
      compareAtPrice: 105000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['diamond-rings']],
      metalType: '18K Yellow Gold',
      availableSizes: ['5', '6', '7', '8'],
      stockQuantity: 4,
      StockStatus: 'In Stock',
      showOnStore: true,
      rating: 5,
      reviewCount: 15,
      tags: ['emerald-cut', 'halo-ring'],
    },

    // ── EARRINGS ──
    {
      Name: 'Chandelier Emerald Drop Earrings',
      slug: 'chandelier-emerald-drop-earrings',
      Description:
        'Heirloom chandelier drop earrings featuring Colombian emerald centers, seed pearl tassels, and 22K gold filigree.',
      shortDescription: 'Grand chandelier drop earrings with emerald and pearl cluster.',
      Price: 14500,
      compareAtPrice: 17000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['earrings']],
      metalType: '22K Gold Vermeil',
      stockQuantity: 6,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      rating: 5,
      reviewCount: 35,
      tags: ['earrings', 'jhumka', 'bestseller'],
    },

    // ── BRIDAL SETS ──
    {
      Name: 'Maharani Royal Bridal Kundan Suite',
      slug: 'maharani-royal-bridal-kundan-suite',
      Description:
        'Complete bridal masterwork including grand choker, long rani haar necklace, matching chandelier earrings, maang tikka, and matha patti.',
      shortDescription: 'Complete 5-piece royal bridal kundan set with emeralds & pearls.',
      Price: 75000,
      compareAtPrice: 88000,
      Images: [
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85' },
        { url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1000&q=85' },
      ],
      Category: [catMap['bridal-sets'], catMap['necklace-sets']],
      metalType: '22K Gold Vermeil',
      availableColors: ['Golden Ruby', 'Golden Emerald', 'Golden Multi'],
      stockQuantity: 2,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      isBestSelling: true,
      rating: 5,
      reviewCount: 48,
      tags: ['bridal-suite', 'maharani', 'polki', 'bestseller'],
    },
  ];

  const createdProducts = await Product.insertMany(productsData);
  console.log(` Created ${createdProducts.length} starter jewelry pieces.`);

  console.log('✨ Seeding verified customer reviews...');
  const reviewsData = [
    {
      productId: createdProducts[0]._id,
      productName: createdProducts[0].Name,
      customerName: 'Ayesha K.',
      rating: 5,
      comment: 'Absolutely stunning set! The emerald drops are vibrant and the weight feels authentic and luxurious.',
      status: 'approved',
    },
    {
      productId: createdProducts[0]._id,
      productName: createdProducts[0].Name,
      customerName: 'Zainab M.',
      rating: 5,
      comment: 'Wore this for my Barat and got countless compliments. Packaging was exquisite!',
      status: 'approved',
    },
    {
      productId: createdProducts[4]._id,
      productName: createdProducts[4].Name,
      customerName: 'Fatima R.',
      rating: 5,
      comment: 'Super sleek bracelet, fits perfectly and the finish looks like real 18K solid gold.',
      status: 'approved',
    },
  ];
  await Review.insertMany(reviewsData);
  console.log(` Created ${reviewsData.length} verified reviews.`);

  console.log('✨ Seeding default store settings...');
  await Settings.create({
    singletonKey: 'site-settings',
    storeName: 'Ornaments by Arshad',
    supportEmail: 'concierge@ornamentsbyarshad.com',
    businessAddress: 'Luxury Jewelry Galleria, Karachi, Pakistan',
    whatsappNumber: '923001234567',
    facebookPageUrl: 'https://www.facebook.com/ornamentsbyarshad',
    instagramUrl: 'https://www.instagram.com/ornamentsbyarshad',
    karachiDeliveryFee: 0,
    outsideKarachiDeliveryFee: 0,
    freeShippingThreshold: 0,
    announcementBarEnabled: true,
    announcementBarText: '✨ Complimentary Insured Delivery Across Pakistan | Handcrafted Fine Jewelry ✨',
  });

  console.log('🎉 Seeding successfully completed!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

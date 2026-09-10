/**
 * Database Seed Script for "Ornaments by Arshad" Luxury Jewelry Store
 * Seeds initial luxury jewelry categories, starter fine jewelry pieces, and default store settings.
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
    tags: { type: [String], default: [] },
    primaryTag: { type: String, default: '' },
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
    supportEmail: { type: String, default: 'support@ornamentsbyarshad.com' },
    businessAddress: { type: String, default: 'Luxury Jewelry Galleria, Karachi, Pakistan' },
    whatsappNumber: { type: String, default: '923000000000' },
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
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

async function seed() {
  console.log('💎 Connecting to isolated database...');
  await mongoose.connect(MONGODB_URI);
  console.log(' Connected to MongoDB.');

  console.log('🧹 Clearing legacy collections...');
  await Category.deleteMany({});
  await Product.deleteMany({});
  await Settings.deleteMany({});

  console.log('✨ Seeding luxury categories...');
  const categoriesData = [
    {
      name: 'Diamond Rings',
      slug: 'diamond-rings',
      description: 'Handcrafted solitaire, halo, and eternity diamond rings crafted in 18K gold and platinum.',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Gold Necklaces',
      slug: 'gold-necklaces',
      description: 'Exquisite 22K and 18K solid gold necklaces, chokers, chains, and diamond pendants.',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Luxury Bangles & Bracelets',
      slug: 'luxury-bangles-bracelets',
      description: 'Traditional heirloom kadas, tennis bracelets, and 21K/22K gold bangles with intricate filigree.',
      image: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=800&q=80',
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Earrings',
      slug: 'earrings',
      description: 'Brilliant diamond studs, chandelier drop earrings, and traditional gold jhumkas.',
      image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
      sortOrder: 4,
      isActive: true,
    },
    {
      name: 'Bridal Sets',
      slug: 'bridal-sets',
      description: 'Comprehensive royal bridal sets crafted with flawless diamonds and pure hallmarked gold.',
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

  console.log('✨ Seeding starter fine jewelry pieces...');
  const productsData = [
    {
      Name: 'The Royal Solitaire Diamond Ring (1.50 Carat)',
      slug: 'royal-solitaire-diamond-ring-1-50-carat',
      Description:
        'A breathtaking six-prong solitaire ring featuring a certified 1.50-carat round brilliant cut diamond mounted in lustrous 18K White Gold. Precision-cut for maximum fire and scintillation, this timeless masterpiece represents the pinnacle of handcrafted sophistication.',
      shortDescription: 'Certified 1.50-carat round brilliant diamond in 18K White Gold.',
      seoTitle: 'Royal Solitaire Diamond Ring 1.50 Ct | Ornaments by Arshad',
      seoDescription:
        'Discover the Royal Solitaire Diamond Ring in 18K White Gold by Ornaments by Arshad. Certified VVS1 clarity, handcrafted to perfection with insured nationwide delivery.',
      seoKeywords: 'diamond ring, solitaire ring, 18k white gold ring, certified diamond pakistan, luxury wedding ring',
      Price: 385000,
      compareAtPrice: 420000,
      Images: [
        {
          url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
        },
        {
          url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=85',
        },
      ],
      Category: [catMap['diamond-rings']],
      metalType: 'White Gold',
      purity: '18K',
      size: '7',
      availableSizes: ['6', '6.5', '7', '7.5', '8'],
      gemstone: {
        gemstoneType: 'Natural Diamond',
        cut: 'Round Brilliant',
        carat: 1.5,
        clarity: 'VVS1',
        color: 'F',
      },
      grossWeightGrams: 4.8,
      certificateNumber: 'GIA-2026-89412',
      stockQuantity: 3,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      featuredPriority: 10,
      isBestSelling: true,
      isNewArrival: false,
      isFreeDelivery: true,
      tags: ['certified-diamond', '18k-gold', 'bestseller'],
      primaryTag: 'featured',
    },
    {
      Name: 'Imperial 22K Gold Heirloom Choker Necklace',
      slug: 'imperial-22k-gold-heirloom-choker-necklace',
      Description:
        'Handcrafted by generational artisans, this imperial choker necklace is fashioned from pure 22K Yellow Gold. Accented with delicate micro-filigree detailing, suspended pearl droplets, and traditional meenakari accents, it is an heirloom treasure for weddings and grand celebrations.',
      shortDescription: 'Pure 22K Yellow Gold handcrafted heirloom choker with pearl accents.',
      seoTitle: 'Imperial 22K Gold Heirloom Choker Necklace | Ornaments by Arshad',
      seoDescription:
        'Exquisite 22K Gold Choker Necklace featuring heritage filigree work. Certified 22K hallmark by Ornaments by Arshad.',
      seoKeywords: 'gold choker, 22k gold necklace, bridal jewelry pakistan, gold necklace design, heirloom jewelry',
      Price: 650000,
      compareAtPrice: 695000,
      Images: [
        {
          url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=85',
        },
        {
          url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=85',
        },
      ],
      Category: [catMap['gold-necklaces']],
      metalType: 'Yellow Gold',
      purity: '22K',
      size: '16"',
      availableSizes: ['16"', '18"'],
      gemstone: {
        gemstoneType: 'Natural South Sea Pearls',
        cut: 'Cabochon',
        carat: 3.2,
        clarity: 'AAA',
        color: 'Lustrous White',
      },
      grossWeightGrams: 32.4,
      certificateNumber: 'OBA-GOLD-22K-4512',
      stockQuantity: 2,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      featuredPriority: 9,
      isBestSelling: false,
      isNewArrival: true,
      isFreeDelivery: true,
      tags: ['22k-gold', 'bridal', 'new-arrival'],
      primaryTag: 'new-arrival',
    },
    {
      Name: 'Eternity Pavé Diamond Tennis Bracelet',
      slug: 'eternity-pave-diamond-tennis-bracelet',
      Description:
        'A continuous cascade of brilliant-cut round diamonds set in four-prong 18K Rose Gold links. Designed with a seamless double-safety clasp, this eternity tennis bracelet adds radiant luxury to both daily elegance and evening galas.',
      shortDescription: '3.00 Ct total diamond weight set in 18K Rose Gold links.',
      seoTitle: 'Eternity Pavé Diamond Tennis Bracelet | Ornaments by Arshad',
      seoDescription:
        'Shop the 3.00 Ct Diamond Tennis Bracelet in 18K Rose Gold. Timeless luxury by Ornaments by Arshad.',
      seoKeywords: 'diamond bracelet, tennis bracelet 18k, rose gold diamond bracelet, fine jewelry pakistan',
      Price: 490000,
      compareAtPrice: 530000,
      Images: [
        {
          url: 'https://images.unsplash.com/photo-1611591475880-998ca4a9a08e?auto=format&fit=crop&w=1000&q=85',
        },
      ],
      Category: [catMap['luxury-bangles-bracelets']],
      metalType: 'Rose Gold',
      purity: '18K',
      size: '7.0"',
      availableSizes: ['6.5"', '7.0"', '7.5"'],
      gemstone: {
        gemstoneType: 'Natural Diamonds',
        cut: 'Round Brilliant',
        carat: 3.0,
        clarity: 'VS1',
        color: 'G',
      },
      grossWeightGrams: 14.2,
      certificateNumber: 'GIA-2026-77319',
      stockQuantity: 4,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      featuredPriority: 8,
      isBestSelling: true,
      isNewArrival: false,
      isFreeDelivery: true,
      tags: ['tennis-bracelet', '18k-gold', 'diamonds'],
      primaryTag: 'bestseller',
    },
    {
      Name: 'Aurora Diamond Chandelier Drop Earrings',
      slug: 'aurora-diamond-chandelier-drop-earrings',
      Description:
        'Cascading pear-shaped and marquise diamonds designed to capture every beam of light. Mounted in solid 18K White Gold, these statement chandelier earrings evoke celestial brilliance and glamorous red-carpet grace.',
      shortDescription: 'Pear & marquise cut natural diamonds in 18K White Gold.',
      seoTitle: 'Aurora Diamond Chandelier Earrings | Ornaments by Arshad',
      seoDescription:
        'Stunning Aurora Chandelier Diamond Earrings by Ornaments by Arshad. Handcrafted with certified diamonds in 18K White Gold.',
      seoKeywords: 'chandelier earrings, diamond earrings, 18k white gold earrings, bridal diamond earrings',
      Price: 320000,
      compareAtPrice: 360000,
      Images: [
        {
          url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=85',
        },
      ],
      Category: [catMap['earrings']],
      metalType: 'White Gold',
      purity: '18K',
      size: 'Standard Drop',
      availableSizes: ['Standard Drop'],
      gemstone: {
        gemstoneType: 'Natural Diamonds',
        cut: 'Pear & Marquise',
        carat: 2.1,
        clarity: 'VVS2',
        color: 'E-F',
      },
      grossWeightGrams: 9.6,
      certificateNumber: 'OBA-DIA-9041',
      stockQuantity: 3,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: false,
      featuredPriority: 5,
      isBestSelling: true,
      isNewArrival: true,
      isFreeDelivery: true,
      tags: ['chandelier-earrings', 'certified-diamonds'],
      primaryTag: 'new-arrival',
    },
    {
      Name: 'The Noor-ul-Ain Royal Bridal Heritage Set',
      slug: 'noor-ul-ain-royal-bridal-heritage-set',
      Description:
        'The quintessential bridal heirloom. Complete set comprising a grand collar necklace, matching statement jhumkas, a delicate maang tikka, and twin handcrafted bangles. Forged from pure 22K Gold and studded with uncut polki diamonds and emerald accents.',
      shortDescription: 'Complete 22K Gold & Polki diamond bridal set with necklace, earrings, tikka & bangles.',
      seoTitle: 'Noor-ul-Ain Royal Bridal Heritage Set | Ornaments by Arshad',
      seoDescription:
        'The majestic Noor-ul-Ain Bridal Jewelry Set in pure 22K Gold and Polki diamonds. Custom crafted for royal brides by Ornaments by Arshad.',
      seoKeywords: 'bridal set pakistan, 22k gold bridal jewelry, polki necklace, royal wedding jewelry',
      Price: 1850000,
      compareAtPrice: 2000000,
      Images: [
        {
          url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85',
        },
      ],
      Category: [catMap['bridal-sets'], catMap['gold-necklaces']],
      metalType: 'Yellow Gold',
      purity: '22K',
      size: 'Bridal Standard',
      availableSizes: ['Bespoke Fitting Available'],
      gemstone: {
        gemstoneType: 'Polki Diamonds & Zambian Emeralds',
        cut: 'Polki Cut',
        carat: 12.5,
        clarity: 'Authentic Polki',
        color: 'Natural Uncut',
      },
      grossWeightGrams: 98.5,
      certificateNumber: 'OBA-BRIDAL-2026-01',
      stockQuantity: 1,
      StockStatus: 'In Stock',
      showOnStore: true,
      isFeatured: true,
      featuredPriority: 12,
      isBestSelling: true,
      isNewArrival: true,
      isFreeDelivery: true,
      tags: ['bridal-set', 'royal-collection', '22k-gold', 'polki'],
      primaryTag: 'featured',
    },
  ];

  const createdProducts = await Product.insertMany(productsData);
  console.log(` Created ${createdProducts.length} starter fine jewelry pieces.`);

  console.log('✨ Initializing store settings for Ornaments by Arshad...');
  await Settings.create({
    singletonKey: 'site-settings',
    storeName: 'Ornaments by Arshad',
    supportEmail: 'support@ornamentsbyarshad.com',
    businessAddress: 'Luxury Jewelry Galleria, Karachi, Pakistan',
    whatsappNumber: '923000000000',
    facebookPageUrl: 'https://www.facebook.com/ornamentsbyarshad',
    instagramUrl: 'https://www.instagram.com/ornamentsbyarshad',
    karachiDeliveryFee: 0,
    outsideKarachiDeliveryFee: 0,
    freeShippingThreshold: 0,
    announcementBarEnabled: true,
    announcementBarText: '✨ Complimentary Insured Nationwide Delivery & Official Hallmark Certification ✨',
    announcementBarMessages: [
      {
        id: 'msg-1',
        text: '✨ Handcrafted Luxury • Pure 22K & 18K Gold • Certified Diamonds ✨',
        isActive: true,
      },
      {
        id: 'msg-2',
        text: '💎 Bespoke Bridal Commissions & Custom Sizing Available 💎',
        isActive: true,
      },
      {
        id: 'msg-3',
        text: '✨ Complimentary Insured Nationwide Delivery & Official Hallmark Certification ✨',
        isActive: true,
      },
    ],
  });

  console.log(' Store settings initialized.');
  console.log('\n🎉 Database seeding for "Ornaments by Arshad" complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

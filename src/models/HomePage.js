import mongoose from 'mongoose';

import {
  HOME_PAGE_PRODUCT_COLLECTIONS,
  HOME_PAGE_SECTION_TYPES,
  HOME_PAGE_SINGLETON_KEY,
} from '@/lib/homePageSections';

const HomePageAssetSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: '',
      trim: true,
    },
    publicId: {
      type: String,
      default: '',
      trim: true,
    },
    blurDataURL: {
      type: String,
      default: '',
    },
  },
  {
    _id: false,
  },
);

const HomePageVideoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: '',
      trim: true,
    },
    publicId: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const HomePageHeroSlideSchema = new mongoose.Schema(
  {
    desktopImage: {
      type: HomePageAssetSchema,
      default: () => ({}),
    },
    tabletImage: {
      type: HomePageAssetSchema,
      default: undefined,
    },
    mobileImage: {
      type: HomePageAssetSchema,
      default: () => ({}),
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const HomePageBannerImageSchema = new mongoose.Schema(
  {
    image: {
      type: HomePageAssetSchema,
      default: () => ({}),
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const HomePageSectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: HOME_PAGE_SECTION_TYPES,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    alt: {
      type: String,
      default: '',
      trim: true,
    },
    categoryId: {
      type: String,
      default: '',
      trim: true,
    },
    collectionKey: {
      type: String,
      enum: HOME_PAGE_PRODUCT_COLLECTIONS,
      default: undefined,
    },
    productLimit: {
      type: Number,
      default: 8,
      min: 1,
      max: 24,
    },
    reviewLimit: {
      type: Number,
      default: 10,
      min: 1,
      max: 10,
    },
    slides: {
      type: [HomePageHeroSlideSchema],
      default: [],
    },
    desktopImages: {
      type: [HomePageBannerImageSchema],
      default: [],
    },
    carouselBanners: {
      type: [HomePageBannerImageSchema],
      default: [],
    },
    mobileImage: {
      type: HomePageBannerImageSchema,
      default: undefined,
    },
    pcVideo: {
      type: HomePageVideoSchema,
      default: undefined,
    },
    mobileVideo: {
      type: HomePageVideoSchema,
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const HomePageSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: HOME_PAGE_SINGLETON_KEY,
      unique: true,
    },
    sections: {
      type: [HomePageSectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

if (mongoose.models.HomePage) {
  delete mongoose.models.HomePage;
}

export default mongoose.models.HomePage || mongoose.model('HomePage', HomePageSchema);

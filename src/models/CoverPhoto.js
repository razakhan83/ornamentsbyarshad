import mongoose from 'mongoose';

const CoverPhotoAssetSchema = new mongoose.Schema(
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

const CoverSlideSchema = new mongoose.Schema(
  {
    desktopImage: {
      type: CoverPhotoAssetSchema,
      default: () => ({}),
    },
    tabletImage: {
      type: CoverPhotoAssetSchema,
      default: () => ({}),
    },
    mobileImage: {
      type: CoverPhotoAssetSchema,
      default: () => ({}),
    },
    alt: {
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

const CoverPhotoSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'home-cover-photos',
      unique: true,
    },
    slides: {
      type: [CoverSlideSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.CoverPhoto || mongoose.model('CoverPhoto', CoverPhotoSchema);

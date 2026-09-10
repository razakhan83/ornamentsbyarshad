import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isApproved: {
      type: Boolean,
      default: false, // Legacy field, kept for backward compatibility
    },
    showOnHome: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ productId: 1, isApproved: 1, createdAt: -1 });
ReviewSchema.index({ showOnHome: 1, isApproved: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ createdAt: -1 });

// Next.js hot reloading cache buster for schema changes
const cachedReview = mongoose.models.Review;
if (cachedReview) {
  const hasImages = !!cachedReview.schema.paths.images;
  const hasStatus = !!cachedReview.schema.paths.status;
  const hasShowOnHome = !!cachedReview.schema.paths.showOnHome;
  
  if (!hasImages || !hasStatus || !hasShowOnHome) {
    delete mongoose.models.Review;
  }
}

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);

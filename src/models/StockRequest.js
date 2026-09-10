import mongoose from 'mongoose';

const StockRequestSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productSlug: {
      type: String,
      trim: true,
      default: '',
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
      default: '',
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'closed'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      default: 'product-detail',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

StockRequestSchema.index({ productId: 1, status: 1, email: 1 });
StockRequestSchema.index({ productId: 1, status: 1, whatsappNumber: 1 });
StockRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.StockRequest || mongoose.model('StockRequest', StockRequestSchema);

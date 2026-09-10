import mongoose from 'mongoose';

const AbandonedCartSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    landmark: {
      type: String,
      default: '',
      trim: true,
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        image: { type: String, default: '' },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ABANDONED', 'RECOVERED', 'DISMISSED'],
      default: 'ABANDONED',
      index: true,
    },
    recoveredOrderId: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AbandonedCartSchema.index({ phone: 1, status: 1 });
AbandonedCartSchema.index({ createdAt: -1 });
// Auto-expire abandoned carts after 30 days
AbandonedCartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.AbandonedCart || mongoose.model('AbandonedCart', AbandonedCartSchema);

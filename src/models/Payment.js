import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: String,
      default: '',
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero.'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Online', 'Cheque', 'Other'],
      default: 'Cash',
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ invoiceId: 1, paymentDate: -1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

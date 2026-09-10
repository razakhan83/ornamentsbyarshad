import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema({
  productId: { type: String, default: '' },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    orderId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required.'],
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true,
    },
    customerCity: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Unique Items Collection',
      trim: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: Date.now,
    },
    terms: {
      type: String,
      default: 'Due on Receipt',
      trim: true,
    },
    salesperson: {
      type: String,
      default: '',
      trim: true,
    },
    items: [InvoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
    },
    customerNotes: {
      type: String,
      default: '1. Thank you for choosing us. We look forward to serving you again.',
    },
    termsAndConditions: {
      type: String,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ customerPhone: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });
InvoiceSchema.index({ isDeleted: 1, createdAt: -1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

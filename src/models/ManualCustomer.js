import mongoose from 'mongoose';

const ManualCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching in the autocomplete typeahead
ManualCustomerSchema.index({ name: 'text', phone: 'text' });
ManualCustomerSchema.index({ createdAt: -1 });

export default mongoose.models.ManualCustomer || mongoose.model('ManualCustomer', ManualCustomerSchema);

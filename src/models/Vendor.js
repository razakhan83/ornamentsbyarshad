import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vendor name is required.'],
      trim: true,
      maxlength: [120, 'Vendor name cannot be more than 120 characters'],
    },
    shopNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: [80, 'Shop number cannot be more than 80 characters'],
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: [40, 'Phone number cannot be more than 40 characters'],
    },
    whatsappNumber: {
      type: String,
      default: '',
      trim: true,
      maxlength: [40, 'WhatsApp number cannot be more than 40 characters'],
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: [160, 'Email cannot be more than 160 characters'],
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: [240, 'Address cannot be more than 240 characters'],
    },
  },
  {
    timestamps: true,
  }
);

VendorSchema.index({ name: 1 });

const cachedVendor = mongoose.models.Vendor;
if (
  cachedVendor &&
  (
    !cachedVendor.schema.path('name') ||
    !cachedVendor.schema.path('shopNumber') ||
    !cachedVendor.schema.path('phone') ||
    !cachedVendor.schema.path('whatsappNumber') ||
    !cachedVendor.schema.path('email') ||
    !cachedVendor.schema.path('address')
  )
) {
  delete mongoose.models.Vendor;
}

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    image: {
      type: String,
    },
    phone: {
      type: String,
    },
    city: {
      type: String,
    },
    address: {
      type: String, // Complete Address
    },
    landmark: {
      type: String,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    forceLogoutAt: {
      type: Date,
    },
    wishlist: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ disabled: 1, createdAt: -1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);

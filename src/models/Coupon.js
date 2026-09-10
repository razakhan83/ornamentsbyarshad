import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    discountType: {
      type: String,
      required: [true, "Discount type is required"],
      enum: {
        values: ["percentage", "fixed_amount", "free_shipping"],
        message: "{VALUE} is not a valid discount type",
      },
    },
    discountValue: {
      type: Number,
      required: [
        function () {
          // Required unless it's free shipping, but even then we usually default to 0
          return this.discountType !== "free_shipping";
        },
        "Discount value is required",
      ],
      min: [0, "Discount value cannot be negative"],
      default: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum order amount cannot be negative"],
    },
    usageLimitPerCoupon: {
      type: Number,
      default: null, // Null means unlimited
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);

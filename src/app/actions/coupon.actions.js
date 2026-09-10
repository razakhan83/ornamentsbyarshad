'use server';

import mongooseConnect from '@/lib/mongooseConnect';
import { normalizeEmail } from '@/lib/admin';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Core coupon validation logic — shared by validateCouponAction (public) and
 * submitOrderAction (in order.actions.js, which has its own copy due to the
 * cross-domain dependency). If this logic ever diverges, update both.
 */
async function validateCouponLogic(code, subtotal, email, phone) {
  const Coupon = (await import('@/models/Coupon')).default;
  const Order = (await import('@/models/Order')).default;

  if (!code) return { success: false, message: 'Coupon code is required.' };

  const coupon = await Coupon.findOne({ code: code.toUpperCase() }).lean();
  if (!coupon) return { success: false, message: 'Invalid coupon code.' };
  if (!coupon.isActive) return { success: false, message: 'This coupon is no longer active.' };

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) return { success: false, message: 'This coupon is not valid yet.' };
  if (coupon.endDate && now > coupon.endDate) return { success: false, message: 'This coupon has expired.' };
  if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) return { success: false, message: `Minimum order amount of Rs. ${coupon.minOrderAmount} required.` };
  if (coupon.usageLimitPerCoupon && coupon.usedCount >= coupon.usageLimitPerCoupon) return { success: false, message: 'This coupon has reached its usage limit.' };

  // Check per-user limit
  if (coupon.usageLimitPerUser) {
    if (!email && !phone) {
      return { success: false, message: 'Please enter your email or phone number in the checkout form to use this coupon.' };
    }

    const query = { couponCode: coupon.code, status: { $ne: 'Cancelled' }, isDraft: { $ne: true } };
    if (email && phone) {
      query.$or = [{ customerEmail: email }, { customerPhone: phone }];
    } else if (email) {
      query.customerEmail = email;
    } else {
      query.customerPhone = phone;
    }

    const pastUses = await Order.countDocuments(query);
    if (pastUses >= coupon.usageLimitPerUser) {
      return { success: false, message: `You have already used this coupon the maximum number of times (${coupon.usageLimitPerUser}).` };
    }
  }

  return { success: true, coupon: coupon.toObject() };
}

// ---------------------------------------------------------------------------
// Exported Server Actions
// ---------------------------------------------------------------------------

export async function validateCouponAction(code, subtotal, customerEmail, customerPhone) {
  try {
    await mongooseConnect();
    const result = await validateCouponLogic(
      code,
      subtotal,
      normalizeEmail(customerEmail || ''),
      String(customerPhone || '').trim()
    );

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      coupon: {
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        minOrderAmount: result.coupon.minOrderAmount,
      }
    };
  } catch (error) {
    console.error('validateCouponAction failed:', error);
    return {
      success: false,
      message: 'Unable to validate coupon right now.',
    };
  }
}

export function normalizeCheckoutCity(city = '') {
  return String(city || '').trim().toLowerCase();
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateCheckoutPricing({
  subtotal = 0,
  city = '',
  settings = {},
  appliedCoupon = null,
} = {}) {
  const safeSubtotal = Math.max(0, toSafeNumber(subtotal));
  const normalizedCity = normalizeCheckoutCity(city);
  const isKarachi = normalizedCity === 'karachi';
  let shippingBase = isKarachi
    ? toSafeNumber(settings?.karachiDeliveryFee, 0)
    : toSafeNumber(settings?.outsideKarachiDeliveryFee, 0);
  
  let discountAmount = 0;
  if (appliedCoupon && safeSubtotal >= (appliedCoupon.minOrderAmount || 0)) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.max(0, (safeSubtotal * appliedCoupon.discountValue) / 100);
    } else if (appliedCoupon.discountType === 'fixed_amount') {
      discountAmount = Math.max(0, Math.min(safeSubtotal, appliedCoupon.discountValue));
    } else if (appliedCoupon.discountType === 'free_shipping') {
      shippingBase = 0;
    }
  }

  const freeShippingThreshold = Math.max(0, toSafeNumber(settings?.freeShippingThreshold, 0));
  const qualifiesByThreshold = freeShippingThreshold > 0 && safeSubtotal >= freeShippingThreshold;
  const qualifiesByCoupon = appliedCoupon?.discountType === 'free_shipping';

  const isFreeShipping = qualifiesByThreshold || qualifiesByCoupon;
  const shipping = isFreeShipping ? 0 : Math.max(0, shippingBase);
  const total = Math.max(0, safeSubtotal - discountAmount) + shipping;

  return {
    subtotal: safeSubtotal,
    shipping,
    total,
    isFreeShipping,
    freeShippingThreshold,
    isKarachi,
    discountAmount,
    appliedCoupon,
  };
}

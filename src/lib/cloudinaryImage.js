const CLOUDINARY_HOSTS = new Set(['res.cloudinary.com']);

export const CLOUDINARY_IMAGE_PRESETS = {
  // ── Store-facing presets ─────────────────────────────────────────────────────

  // Product cards: mobile-first sizing
  // Mobile: 2-column grid → ~180px wide per card on a 360px screen
  // Tablet: 3-column grid → ~240px wide per card
  // Desktop: 4-column grid → ~285px wide per card
  // We use 380px as the Cloudinary transform width to cover 2x DPR on mobile
  // (180px × 2 = 360px ≈ 380px with some breathing room)
  productCard: { width: 380, crop: 'fill', gravity: 'auto', format: 'avif', quality: 75 },

  // Category circles: small fixed-size icons in the horizontal carousel
  categoryCircle: { width: 216, height: 216, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },

  // Hero slider: full-width banner images
  heroFull: { width: 1400, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },
  heroMobile: { width: 640, crop: 'fill', gravity: 'auto', format: 'avif', quality: 78 },

  // Product detail gallery — main image (Next.js srcset handles DPR; keep master modest)
  productGalleryMain: { width: 960, height: 960, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },

  // Home / category banners (below-fold; Next optimizer + sizes do the rest)
  storeBanner: { width: 960, crop: 'fill', gravity: 'auto', format: 'avif', quality: 75 },

  // Product detail gallery — thumbnail strip
  productGalleryThumb: { width: 240, height: 240, crop: 'fill', gravity: 'auto', format: 'avif', quality: 75 },

  // Search suggestions dropdown — tiny thumbnails
  searchSuggestion: { width: 96, height: 96, crop: 'fill', gravity: 'auto', format: 'avif', quality: 72 },

  // Cart drawer line items
  cartItem: { width: 160, height: 160, crop: 'fill', gravity: 'auto', format: 'avif', quality: 75 },

  // Product quick-view modal
  productModal: { width: 960, height: 960, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },

  // Social share preview card (WhatsApp / Facebook / Twitter):
  // 1200x630 landscape banner
  socialShare: { width: 1200, height: 630, crop: 'fill', gravity: 'auto', format: 'jpg', quality: 85 },
  socialSharePad: { width: 1200, height: 630, crop: 'pad', background: 'rgb:ffffff', format: 'jpg', quality: 85 },
  // 1080x1080 square card (for 1:1 social preview)
  socialShareSquare: { width: 1080, height: 1080, crop: 'fill', gravity: 'auto', format: 'jpg', quality: 85 },
  socialShareSquarePad: { width: 1080, height: 1080, crop: 'pad', background: 'rgb:ffffff', format: 'jpg', quality: 85 },

  // ── Admin-facing presets ─────────────────────────────────────────────────────
  // Admin thumbnails don't need AVIF since they're behind auth and not LCP-critical
  adminThumb: { width: 128, height: 128, crop: 'fill', gravity: 'auto', format: 'webp', quality: 80 },
};

function buildCloudinaryTransformSegment(options = {}) {
  const transforms = [];

  if (options.background) transforms.push(`b_${options.background}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);
  if (options.width) transforms.push(`w_${Math.round(options.width)}`);
  if (options.height) transforms.push(`h_${Math.round(options.height)}`);

  transforms.push(`q_${options.quality || 'auto'}`);
  transforms.push(`f_${options.format || 'avif'}`);
  // Default off: next/image already builds a device srcset. Cloudinary dpr_auto
  // would follow the optimizer server's UA, not the shopper's phone.
  if (options.includeDpr === true) {
    transforms.push(`dpr_${options.dpr || 'auto'}`);
  }

  return transforms.join(',');
}

function looksLikeCloudinaryTransformSegment(segment = '') {
  return /^(?:[a-z]{1,3}_[^/]+)(?:,(?:[a-z]{1,3}_[^/]+))*$/.test(segment);
}

export function optimizeCloudinaryUrl(url = '', options = {}) {
  const source = String(url || '').trim();
  if (!source) return '';

  try {
    const parsed = new URL(source);
    if (!CLOUDINARY_HOSTS.has(parsed.hostname)) {
      return source;
    }

    const uploadSegment = '/image/upload/';
    if (!parsed.pathname.includes(uploadSegment)) {
      return source;
    }

    const transformSegment = buildCloudinaryTransformSegment(options);
    const segments = parsed.pathname.split('/');
    const uploadIndex = segments.findIndex((segment) => segment === 'upload');

    if (uploadIndex === -1) {
      return source;
    }

    const nextSegment = segments[uploadIndex + 1];
    const hasExistingTransform = looksLikeCloudinaryTransformSegment(nextSegment);

    if (hasExistingTransform) {
      segments[uploadIndex + 1] = transformSegment;
    } else {
      segments.splice(uploadIndex + 1, 0, transformSegment);
    }

    parsed.pathname = segments.join('/');

    return parsed.toString();
  } catch {
    return source;
  }
}

export function getProductSocialShareImage(url = '', ratio = '1.91:1', fit = 'cover') {
  const source = String(url || '').trim();
  if (!source) return '';

  const isSquare = ratio === '1:1';
  const isPng = source.toLowerCase().includes('.png') || source.toLowerCase().includes('/png');
  const usePad = fit === 'contain' || isPng;

  const preset = isSquare
    ? (usePad ? CLOUDINARY_IMAGE_PRESETS.socialShareSquarePad : CLOUDINARY_IMAGE_PRESETS.socialShareSquare)
    : (usePad ? CLOUDINARY_IMAGE_PRESETS.socialSharePad : CLOUDINARY_IMAGE_PRESETS.socialShare);

  return optimizeCloudinaryUrl(source, preset) || source;
}

export function optimizeCloudinaryAsset(asset, options = {}) {
  if (!asset || typeof asset !== 'object') return asset;

  return {
    ...asset,
    url: optimizeCloudinaryUrl(asset.url, options),
  };
}

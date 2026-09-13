const CLOUDINARY_HOSTS = new Set(['res.cloudinary.com']);

export const CLOUDINARY_IMAGE_PRESETS = {
  // ── Store-facing presets ─────────────────────────────────────────────────────

  // Product cards: mobile-first sizing (serves uncropped image for Next.js to handle)
  productCard: { width: 500, crop: 'limit', format: 'avif', quality: 78 },

  // Category circles: small fixed-size icons in the horizontal carousel
  categoryCircle: { width: 216, height: 216, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },

  // Hero slider: full-width banner images
  heroFull: { width: 1400, crop: 'fill', gravity: 'auto', format: 'avif', quality: 80 },
  heroMobile: { width: 640, crop: 'fill', gravity: 'auto', format: 'avif', quality: 78 },

  // Product detail gallery — main image (preserves full aspect ratio, never crops)
  productGalleryMain: { width: 1200, crop: 'limit', format: 'avif', quality: 82 },

  // Product detail gallery — high resolution zoom lens (preserves full original image)
  productGalleryZoom: { width: 2200, crop: 'limit', format: 'avif', quality: 88 },

  // Home / category banners (below-fold; Next optimizer + sizes do the rest)
  storeBanner: { width: 1400, crop: 'limit', format: 'avif', quality: 78 },

  // Product detail gallery — thumbnail strip (uncropped)
  productGalleryThumb: { width: 300, crop: 'limit', format: 'avif', quality: 75 },

  // Search suggestions dropdown — tiny thumbnails
  searchSuggestion: { width: 120, crop: 'limit', format: 'avif', quality: 72 },

  // Cart drawer line items
  cartItem: { width: 200, crop: 'limit', format: 'avif', quality: 75 },

  // Product quick-view modal
  productModal: { width: 1200, crop: 'limit', format: 'avif', quality: 80 },

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

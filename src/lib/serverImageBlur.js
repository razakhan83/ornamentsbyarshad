import 'server-only';

import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { generateBlurDataURLFromDataUrl, generateBlurDataURLFromRemoteUrl } from '@/lib/imagePlaceholders';

function toStringValue(value) {
  return String(value || '').trim();
}

export async function ensureAssetBlurData(asset, options = {}) {
  const source = asset && typeof asset === 'object' ? asset : {};
  const url = optimizeCloudinaryUrl(toStringValue(source.url || source.image));

  if (!url) return null;

  let blurDataURL = toStringValue(source.blurDataURL);
  const imageDataUrl = toStringValue(source.imageDataUrl || options.imageDataUrl);

  if (!blurDataURL && imageDataUrl) {
    blurDataURL = await generateBlurDataURLFromDataUrl(imageDataUrl);
  }

  if (!blurDataURL) {
    blurDataURL = await generateBlurDataURLFromRemoteUrl(url);
  }

  return {
    url,
    publicId: toStringValue(source.publicId || source.public_id),
    blurDataURL,
  };
}

export async function ensureProductImagesBlur(images, fallbackImage = '') {
  const inputImages = Array.isArray(images) ? images : [];
  const normalized = await Promise.all(
    inputImages.map((image) => ensureAssetBlurData(image)).filter(Boolean),
  );
  const validImages = normalized.filter(Boolean);

  if (validImages.length > 0) {
    return validImages;
  }

  const fallback = await ensureAssetBlurData(
    typeof fallbackImage === 'string' ? { url: fallbackImage } : fallbackImage,
  );

  return fallback ? [fallback] : [];
}

import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

export function normalizeProductImage(image) {
  if (!image) return null;

  if (typeof image === "string") {
    return {
      url: optimizeCloudinaryUrl(image),
      blurDataURL: "",
      publicId: "",
    };
  }

  if (typeof image === "object" && typeof image.url === "string") {
    return {
      url: optimizeCloudinaryUrl(image.url),
      blurDataURL: image.blurDataURL || "",
      publicId: image.publicId || image.public_id || "",
    };
  }

  return null;
}

export function normalizeProductImages(images, fallbackImage = "") {
  const normalizedImages = Array.isArray(images)
    ? images.map(normalizeProductImage).filter(Boolean)
    : [];

  if (normalizedImages.length > 0) {
    return normalizedImages;
  }

  const fallback = normalizeProductImage(fallbackImage);
  return fallback ? [fallback] : [];
}

export function moveProductImageToFront(images, index) {
  if (!Array.isArray(images)) return [];

  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= images.length) {
    return [...images];
  }

  if (safeIndex === 0) {
    return [...images];
  }

  const nextImages = [...images];
  const [selectedImage] = nextImages.splice(safeIndex, 1);
  nextImages.unshift(selectedImage);
  return nextImages;
}

export function getPrimaryProductImage(product) {
  const normalizedImages = normalizeProductImages(product?.Images);

  return normalizedImages[0] || null;
}

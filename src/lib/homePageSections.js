import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

export const HOME_PAGE_SINGLETON_KEY = 'storefront-home-page';
export const HOME_PAGE_PRODUCT_COLLECTIONS = [
  'featured',
  'new-arrivals',
  'best-sellers',
  'special-offers',
  'top-rated',
];
export const HOME_PAGE_SECTION_TYPES = [
  'HeroSlider',
  'CategoriesGrid',
  'ProductBanner',
  'ScrollableBannerCarousel',
  'ProductGridByCategory',
  'ProductCollection',
  'VideoCatalog',
  'CustomerReviews',
];

function cleanText(value = '') {
  return String(value || '').trim();
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAsset(asset, fallbackAsset = null) {
  const source = asset && typeof asset === 'object' ? asset : {};
  const fallback = fallbackAsset && typeof fallbackAsset === 'object' ? fallbackAsset : {};
  const url = cleanText(source.url || source.image || fallback.url || fallback.image);

  if (!url) return null;

  return {
    url: optimizeCloudinaryUrl(url),
    publicId: cleanText(source.publicId || source.public_id || fallback.publicId || fallback.public_id),
    blurDataURL: cleanText(source.blurDataURL || fallback.blurDataURL),
  };
}

function normalizeBannerImage(item) {
  const source = item && typeof item === 'object' ? item : {};
  const image = normalizeAsset(source.image || source.asset || source);
  if (!image) return null;

  return {
    image,
    link: cleanText(source.link),
    alt: cleanText(source.alt),
  };
}

function createSectionId(type, index) {
  const prefix = cleanText(type || 'section').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${prefix}-${index + 1}`;
}

function normalizeHeroSlides(slides = []) {
  if (!Array.isArray(slides)) return [];

  return slides
    .map((slide, index) => {
      const desktopImage = normalizeAsset(slide?.desktopImage || slide, slide);
      if (!desktopImage) return null;

      const mobileImage = normalizeAsset(slide?.mobileImage, desktopImage) || desktopImage;
      const tabletImage = normalizeAsset(slide?.tabletImage, desktopImage);

      return {
        desktopImage,
        mobileImage,
        ...(tabletImage ? { tabletImage } : {}),
        alt: cleanText(slide?.alt),
        link: cleanText(slide?.link),
        sortOrder: safeNumber(slide?.sortOrder, index),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((slide, index) => ({
      ...slide,
      sortOrder: index,
    }));
}

export function normalizeHomePageSection(section, index = 0) {
  const type = HOME_PAGE_SECTION_TYPES.includes(section?.type)
    ? section.type
    : 'CategoriesGrid';

  const baseSection = {
    id: cleanText(section?.id) || createSectionId(type, index),
    type,
    order: safeNumber(section?.order, index),
    isEnabled: section?.isEnabled !== false,
    title: cleanText(section?.title),
    description: cleanText(section?.description),
    link: cleanText(section?.link),
    alt: cleanText(section?.alt),
  };

  if (type === 'HeroSlider') {
    return {
      ...baseSection,
      slides: normalizeHeroSlides(section?.slides),
    };
  }

  if (type === 'ProductBanner') {
    const legacyDesktopImage = normalizeAsset(section?.desktopImage);
    const legacyMobileImage = normalizeAsset(section?.mobileImage);

    return {
      ...baseSection,
      desktopImages: [
        normalizeBannerImage(section?.desktopImages?.[0]) || (legacyDesktopImage ? { image: legacyDesktopImage, link: cleanText(section?.link), alt: cleanText(section?.alt) } : null),
        normalizeBannerImage(section?.desktopImages?.[1]),
      ].filter(Boolean),
      mobileImage: normalizeBannerImage(section?.mobileImage) || (legacyMobileImage ? { image: legacyMobileImage, link: cleanText(section?.link), alt: cleanText(section?.alt) } : null),
    };
  }

  if (type === 'ScrollableBannerCarousel') {
    return {
      ...baseSection,
      carouselBanners: Array.isArray(section?.carouselBanners)
        ? section.carouselBanners.map(normalizeBannerImage).filter(Boolean)
        : [],
    };
  }

  if (type === 'ProductGridByCategory') {
    return {
      ...baseSection,
      categoryId: cleanText(section?.categoryId),
      productLimit: Math.min(24, Math.max(1, safeNumber(section?.productLimit, 8))),
    };
  }

  if (type === 'ProductCollection') {
    const collectionKey = HOME_PAGE_PRODUCT_COLLECTIONS.includes(cleanText(section?.collectionKey))
      ? cleanText(section?.collectionKey)
      : 'new-arrivals';

    return {
      ...baseSection,
      collectionKey,
      productLimit: Math.min(24, Math.max(1, safeNumber(section?.productLimit, 8))),
    };
  }

  if (type === 'VideoCatalog') {
    const pcVideo = section?.pcVideo && typeof section.pcVideo === 'object' ? section.pcVideo : null;
    const mobileVideo = section?.mobileVideo && typeof section.mobileVideo === 'object' ? section.mobileVideo : null;
    
    return {
      ...baseSection,
      pcVideo: pcVideo ? {
        url: cleanText(pcVideo.url),
        publicId: cleanText(pcVideo.publicId || pcVideo.public_id),
      } : null,
      mobileVideo: mobileVideo ? {
        url: cleanText(mobileVideo.url),
        publicId: cleanText(mobileVideo.publicId || mobileVideo.public_id),
      } : null,
    };
  }

  if (type === 'CustomerReviews') {
    return {
      ...baseSection,
      reviewLimit: Math.min(10, Math.max(1, safeNumber(section?.reviewLimit, 10))),
    };
  }

  return baseSection;
}

export function normalizeHomePageSections(sections = []) {
  if (!Array.isArray(sections)) return [];

  return sections
    .map((section, index) => normalizeHomePageSection(section, index))
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      ...section,
      order: index,
    }));
}

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import { ensureAssetBlurData } from '@/lib/serverImageBlur';
import HomePage from '@/models/HomePage';
import {
  HOME_PAGE_PRODUCT_COLLECTIONS,
  HOME_PAGE_SECTION_TYPES,
  HOME_PAGE_SINGLETON_KEY,
} from '@/lib/homePageSections';

function cleanText(value = '') {
  return String(value || '').trim();
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createSectionId(type, index) {
  const prefix = cleanText(type || 'section').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${prefix}-${index + 1}`;
}

function toAssetInput(asset, imageDataUrl = '') {
  const source = asset && typeof asset === 'object' ? asset : {};
  const url = cleanText(source.url || source.image);
  const publicId = cleanText(source.publicId || source.public_id);
  const blurDataURL = cleanText(source.blurDataURL);
  const inlineDataUrl = cleanText(source.imageDataUrl || imageDataUrl);

  if (!url && !inlineDataUrl) return null;

  return {
    ...(url ? { url } : {}),
    ...(publicId ? { publicId } : {}),
    ...(blurDataURL ? { blurDataURL } : {}),
    ...(inlineDataUrl ? { imageDataUrl: inlineDataUrl } : {}),
  };
}

async function normalizeHeroSlides(slides = []) {
  if (!Array.isArray(slides)) return [];

  const normalized = await Promise.all(
    slides.map(async (slide, index) => {
      const desktopImage = await ensureAssetBlurData(
        toAssetInput(slide?.desktopImage, slide?.desktopImageDataUrl || slide?.imageDataUrl),
      );
      if (!desktopImage) return null;

      const mobileImage = await ensureAssetBlurData(
        toAssetInput(slide?.mobileImage, slide?.mobileImageDataUrl),
      );
      const tabletImage = await ensureAssetBlurData(
        toAssetInput(slide?.tabletImage, slide?.tabletImageDataUrl),
      );

      return {
        desktopImage,
        mobileImage: mobileImage || desktopImage,
        ...(tabletImage ? { tabletImage } : {}),
        alt: cleanText(slide?.alt),
        link: cleanText(slide?.link),
        sortOrder: index,
      };
    }),
  );

  return normalized.filter(Boolean);
}

async function normalizeBannerImages(images = []) {
  if (!Array.isArray(images)) return [];

  const normalized = await Promise.all(
    images.map(async (entry) => {
      const image = await ensureAssetBlurData(
        toAssetInput(entry?.image, entry?.imageDataUrl),
      );

      if (!image) return null;

      return {
        image,
        link: cleanText(entry?.link),
        alt: cleanText(entry?.alt),
      };
    }),
  );

  return normalized.filter(Boolean);
}

async function normalizeSectionForSave(section, index) {
  const type = HOME_PAGE_SECTION_TYPES.includes(section?.type) ? section.type : 'CategoriesGrid';
  const baseSection = {
    id: cleanText(section?.id) || createSectionId(type, index),
    type,
    order: index,
    isEnabled: section?.isEnabled !== false,
    title: cleanText(section?.title),
    description: cleanText(section?.description),
    link: cleanText(section?.link),
    alt: cleanText(section?.alt),
  };

  if (type === 'HeroSlider') {
    return {
      ...baseSection,
      slides: await normalizeHeroSlides(section?.slides),
    };
  }

  if (type === 'ProductBanner') {
    const desktopImages = await normalizeBannerImages([
      section?.desktopImages?.[0],
      section?.desktopImages?.[1],
    ]);
    const mobileImageAsset = await ensureAssetBlurData(
      toAssetInput(section?.mobileImage?.image, section?.mobileImage?.imageDataUrl || section?.mobileImageDataUrl),
    );

    return {
      ...baseSection,
      desktopImages: desktopImages.filter(Boolean),
      ...(mobileImageAsset
        ? {
            mobileImage: {
              image: mobileImageAsset,
              link: cleanText(section?.mobileImage?.link),
              alt: cleanText(section?.mobileImage?.alt),
            },
          }
        : {}),
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

  if (type === 'ScrollableBannerCarousel') {
    return {
      ...baseSection,
      carouselBanners: await normalizeBannerImages(section?.carouselBanners),
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
    return {
      ...baseSection,
      collectionKey: HOME_PAGE_PRODUCT_COLLECTIONS.includes(cleanText(section?.collectionKey))
        ? cleanText(section?.collectionKey)
        : 'new-arrivals',
      productLimit: Math.min(24, Math.max(1, safeNumber(section?.productLimit, 8))),
    };
  }

  return baseSection;
}

function serializeHomePageDocument(document) {
  return {
    _id: document._id.toString(),
    sections: Array.isArray(document.sections)
      ? document.sections.map((section, index) => ({
          ...section,
          id: cleanText(section.id) || createSectionId(section.type, index),
          order: safeNumber(section.order, index),
        }))
      : [],
  };
}

export async function GET() {
  try {
    await mongooseConnect();

    let homePage = await HomePage.findOne({ singletonKey: HOME_PAGE_SINGLETON_KEY }).lean();
    if (!homePage) {
      homePage = await HomePage.create({ singletonKey: HOME_PAGE_SINGLETON_KEY, sections: [] });
      homePage = homePage.toObject();
    }

    return NextResponse.json({ success: true, data: serializeHomePageDocument(homePage) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await mongooseConnect();

    const body = await request.json();
    const inputSections = Array.isArray(body?.sections) ? body.sections : [];
    const sections = await Promise.all(inputSections.map((section, index) => normalizeSectionForSave(section, index)));

    const homePage = await HomePage.findOneAndUpdate(
      { singletonKey: HOME_PAGE_SINGLETON_KEY },
      { $set: { sections } },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    revalidateTag('home-page', 'max');
    revalidateTag('home-sections', 'max');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      data: serializeHomePageDocument(homePage),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

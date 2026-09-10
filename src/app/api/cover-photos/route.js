// @ts-nocheck
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import CoverPhoto from '@/models/CoverPhoto';
import { ensureAssetBlurData } from '@/lib/serverImageBlur';

const SINGLETON_KEY = 'home-cover-photos';

function normalizeAsset(asset, fallback = null) {
  const source = asset && typeof asset === 'object' ? asset : {};
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {};
  const url = String(source.url || fallbackSource.url || '').trim();
  if (!url) return null;

  return {
    url,
    publicId: String(source.publicId || fallbackSource.publicId || '').trim(),
    blurDataURL: String(source.blurDataURL || fallbackSource.blurDataURL || '').trim(),
  };
}

async function normalizeSlides(input) {
  if (!Array.isArray(input)) return [];

  const slides = await Promise.all(
    input.map(async (item, index) => {
      const desktopImage = await ensureAssetBlurData(normalizeAsset(item?.desktopImage || item, item), {
        imageDataUrl: item?.desktopImage?.imageDataUrl || item?.imageDataUrl || '',
      });
      if (!desktopImage) return null;

      const slide = {
        desktopImage,
        alt: String(item?.alt || '').trim(),
        sortOrder: Number(item?.sortOrder ?? index) || 0,
      };

      const tabletImage = await ensureAssetBlurData(normalizeAsset(item?.tabletImage), {
        imageDataUrl: item?.tabletImage?.imageDataUrl || '',
      });
      const mobileImage = await ensureAssetBlurData(normalizeAsset(item?.mobileImage), {
        imageDataUrl: item?.mobileImage?.imageDataUrl || '',
      });

      if (tabletImage) slide.tabletImage = tabletImage;
      if (mobileImage) slide.mobileImage = mobileImage;

      return slide;
    }),
  );

  return slides.filter(Boolean);
}

export async function GET() {
  try {
    await mongooseConnect();

    let coverPhoto = await CoverPhoto.findOne({ singletonKey: SINGLETON_KEY }).lean();
    if (!coverPhoto) {
      coverPhoto = await CoverPhoto.create({ singletonKey: SINGLETON_KEY });
      coverPhoto = coverPhoto.toObject();
    }

    coverPhoto._id = coverPhoto._id.toString();
    return NextResponse.json({ success: true, data: coverPhoto });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
    }

    await mongooseConnect();

    const body = await req.json();
    const slides = await normalizeSlides(body.slides);

    const coverPhoto = await CoverPhoto.findOneAndUpdate(
      { singletonKey: SINGLETON_KEY },
      { $set: { slides } },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    coverPhoto._id = coverPhoto._id.toString();
    revalidateTag('cover-photos', 'max');
    revalidateTag('home-sections');

    return NextResponse.json({ success: true, data: coverPhoto });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


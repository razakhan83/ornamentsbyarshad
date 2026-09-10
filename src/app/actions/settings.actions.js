'use server';

import { revalidateTag } from 'next/cache';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import { mergeCustomPages } from '@/lib/customPages';
import { getServerSession } from 'next-auth';
import { storeSettingsSchema } from '@/lib/validation';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'site-settings';

async function assertAdmin(isMutation = true) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin) {
    throw new Error('Unauthorized access');
  }
  if (isMutation && session.user?.isDemo) {
    throw new Error('Demo Mode: Actions are disabled. You have read-only access.');
  }
  return session;
}

function normalizeCoverImages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const normalizeAsset = (asset, fallback = null) => {
        const source = asset && typeof asset === 'object' ? asset : {};
        const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {};
        const url = String(source.url || fallbackSource.url || '').trim();
        if (!url) return null;

        return {
          url,
          publicId: String(source.publicId || fallbackSource.publicId || '').trim(),
          blurDataURL: String(source.blurDataURL || fallbackSource.blurDataURL || '').trim(),
        };
      };

      const legacyDesktop = {
        url: item?.desktopImage?.url || item?.url || item?.image || '',
        publicId: item?.desktopImage?.publicId || item?.publicId || item?.public_id || '',
        blurDataURL: item?.desktopImage?.blurDataURL || item?.blurDataURL || '',
      };
      const desktopImage = normalizeAsset(legacyDesktop);
      if (!desktopImage) return null;
      const tabletImage = normalizeAsset(item?.tabletImage);
      const mobileImage = normalizeAsset(item?.mobileImage);

      const normalizedItem = {
        desktopImage,
        alt: String(item?.alt || '').trim(),
        sortOrder: Number(item?.sortOrder ?? index) || 0,
      };

      if (tabletImage) {
        normalizedItem.tabletImage = tabletImage;
      }

      if (mobileImage) {
        normalizedItem.mobileImage = mobileImage;
      }

      return normalizedItem;
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Exported Server Actions
// ---------------------------------------------------------------------------

export async function saveStoreSettingsAction(nextSettings) {
  await assertAdmin();

  const validation = storeSettingsSchema.safeParse(nextSettings);
  if (!validation.success) {
    return { success: false, error: validation.error.issues?.[0]?.message || 'Validation failed' };
  }
  const validatedData = validation.data;

  await mongooseConnect();
  const Settings = (await import('@/models/Settings')).default;

  const allowedFields = [
    'storeName',
    'supportEmail',
    'businessAddress',
    'whatsappNumber',
    'facebookPageUrl',
    'instagramUrl',
    'trackingEnabled',
    'facebookPixelId',
    'facebookConversionsApiToken',
    'facebookTestEventCode',
    'tiktokPixelId',
    'tiktokAccessToken',
    'karachiDeliveryFee',
    'outsideKarachiDeliveryFee',
    'freeShippingThreshold',
    'announcementBarEnabled',
    'announcementBarText',
    'coverImages',
    'customPages',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (validatedData[field] !== undefined) {
      updates[field] =
        field === 'coverImages'
          ? normalizeCoverImages(validatedData[field])
          : field === 'customPages'
            ? mergeCustomPages(validatedData[field])
            : validatedData[field];
    }
  }

  const settings = await Settings.findOneAndUpdate(
    { singletonKey: SETTINGS_KEY },
    { $set: updates },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  revalidateTag('settings');
  revalidateTag('home-sections');

  return {
    success: true,
    data: {
      ...settings,
      _id: settings._id.toString(),
    },
  };
}

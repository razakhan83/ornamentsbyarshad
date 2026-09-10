// @ts-nocheck
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import mongooseConnect from '@/lib/mongooseConnect';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { mergeCustomPages } from '@/lib/customPages';
import Settings from '@/models/Settings';

const SINGLETON_KEY = 'site-settings';

function normalizeAnnouncementMessages(messages = [], fallbackText = '') {
    const rawMessages = Array.isArray(messages) && messages.length > 0
        ? messages
        : String(fallbackText || '')
            .split(/\r?\n|[|•]+/)
            .map((text) => ({ text }))
            .filter((entry) => String(entry?.text || '').trim());

    return rawMessages
        .map((entry, index) => ({
            id: String(entry?.id || `announcement-${index + 1}`).trim(),
            text: String(entry?.text || '').trim(),
            isActive: entry?.isActive !== false,
        }))
        .filter((entry) => entry.text);
}

function normalizeLogoUrl(value = '') {
    return optimizeCloudinaryUrl(String(value || '').trim(), {
        format: 'auto',
        quality: 'auto',
    });
}

function normalizeFaviconSize(value) {
    return Math.min(256, Math.max(32, Number(value) || 64));
}

function normalizeFaviconUrl(value = '', size = 64) {
    const normalizedSize = normalizeFaviconSize(size);
    return optimizeCloudinaryUrl(String(value || '').trim(), {
        width: normalizedSize,
        height: normalizedSize,
        crop: 'fill',
        gravity: 'auto',
        format: 'png',
        quality: 'auto',
    });
}

function normalizeLogoScalePercent(value, fallback = 100) {
    return Math.min(200, Math.max(40, Number(value) || fallback));
}

function serializeSettings(settings) {
    return {
        _id: settings._id.toString(),
        storeName: settings.storeName || 'Ornaments by Arshad',
        supportEmail: settings.supportEmail || '',
        businessAddress: settings.businessAddress || '',
        lightLogoUrl: normalizeLogoUrl(settings.lightLogoUrl),
        darkLogoUrl: normalizeLogoUrl(settings.darkLogoUrl),
        faviconSizePx: normalizeFaviconSize(settings.faviconSizePx),
        faviconUrl: normalizeFaviconUrl(settings.faviconUrl, settings.faviconSizePx),
        logoScalePercent: Math.min(200, Math.max(60, Number(settings.logoScalePercent || 100))),
        emailLogoScalePercent: normalizeLogoScalePercent(settings.emailLogoScalePercent, 100),
        invoiceLogoScalePercent: normalizeLogoScalePercent(settings.invoiceLogoScalePercent, 100),
        whatsappNumber: settings.whatsappNumber || '',
        facebookPageUrl: settings.facebookPageUrl || '',
        instagramUrl: settings.instagramUrl || '',
        trackingEnabled: settings.trackingEnabled === true,
        facebookPixelId: settings.facebookPixelId || '',
        tiktokPixelId: settings.tiktokPixelId || '',
        karachiDeliveryFee: Number(settings.karachiDeliveryFee || 200),
        outsideKarachiDeliveryFee: Number(settings.outsideKarachiDeliveryFee || 300),
        freeShippingThreshold: Number(settings.freeShippingThreshold || 5000),
        announcementBarEnabled: settings.announcementBarEnabled ?? true,
        announcementBarText: settings.announcementBarText || '',
        bankDepositEnabled: settings.bankDepositEnabled === true,
        bankDepositAccountDetails: settings.bankDepositAccountDetails || '',
        enableSecondaryNoc: settings.enableSecondaryNoc === true,
        announcementBarMessages: normalizeAnnouncementMessages(
            settings.announcementBarMessages,
            settings.announcementBarText
        ),
        homepageSectionOrder: Array.isArray(settings.homepageSectionOrder) ? settings.homepageSectionOrder : [],
        customPages: mergeCustomPages(settings.customPages),
    };
}

function serializeAdminSettings(settings) {
    return {
        ...serializeSettings(settings),
        facebookConversionsApiToken: settings.facebookConversionsApiToken || '',
        facebookTestEventCode: settings.facebookTestEventCode || '',
        tiktokAccessToken: settings.tiktokAccessToken || '',
    };
}

// GET settings — Public (used across the site)
export async function GET() {
    try {
        await mongooseConnect();

        // Find or create the singleton settings document
        let settings = await Settings.findOne({ singletonKey: SINGLETON_KEY }).lean();

        if (!settings) {
            settings = await Settings.create({ singletonKey: SINGLETON_KEY });
            settings = settings.toObject();
        }

        return NextResponse.json({
            success: true,
            data: serializeSettings(settings),
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT update settings — Admin only
export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.isAdmin) {
            return NextResponse.json({ success: false, message: 'Unauthorized Access' }, { status: 401 });
        }

        await mongooseConnect();

        const body = await req.json();

        // Only allow whitelisted fields
        const allowedFields = [
            'storeName',
            'supportEmail',
            'businessAddress',
            'lightLogoUrl',
            'darkLogoUrl',
            'faviconUrl',
            'faviconSizePx',
            'logoScalePercent',
            'emailLogoScalePercent',
            'invoiceLogoScalePercent',
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
            'announcementBarMessages',
            'bankDepositEnabled',
            'bankDepositAccountDetails',
            'homepageSectionOrder',
            'customPages',
            'enableSecondaryNoc',
        ];

        const normalizedFaviconSize = body.faviconSizePx !== undefined
            ? normalizeFaviconSize(body.faviconSizePx)
            : undefined;

        const updates = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                updates[key] =
                    key === 'announcementBarMessages'
                        ? normalizeAnnouncementMessages(body[key], body.announcementBarText)
                        : key === 'customPages'
                            ? mergeCustomPages(body[key])
                        : key === 'lightLogoUrl' || key === 'darkLogoUrl'
                            ? normalizeLogoUrl(body[key])
                        : key === 'faviconUrl'
                            ? normalizeFaviconUrl(body[key], normalizedFaviconSize ?? body.faviconSizePx)
                        : key === 'faviconSizePx'
                            ? normalizedFaviconSize
                        : key === 'logoScalePercent'
                            ? Math.min(200, Math.max(60, Number(body[key]) || 100))
                        : key === 'emailLogoScalePercent' || key === 'invoiceLogoScalePercent'
                            ? normalizeLogoScalePercent(body[key], 100)
                        : body[key];
            }
        }

        if (
            updates.faviconUrl === undefined &&
            normalizedFaviconSize !== undefined &&
            body.faviconUrl === undefined
        ) {
            const existingSettings = await Settings.findOne({ singletonKey: SINGLETON_KEY }, 'faviconUrl').lean();
            if (existingSettings?.faviconUrl) {
                updates.faviconUrl = normalizeFaviconUrl(existingSettings.faviconUrl, normalizedFaviconSize);
            }
        }

        const settings = await Settings.findOneAndUpdate(
            { singletonKey: SINGLETON_KEY },
            { $set: updates },
            { new: true, upsert: true, runValidators: true }
        ).lean();

        revalidateTag('settings', 'max');
        revalidateTag('home-sections');
        revalidatePath('/');

        return NextResponse.json({ success: true, data: serializeAdminSettings(settings) });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

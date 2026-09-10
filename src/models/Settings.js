import mongoose from 'mongoose';

const AnnouncementMessageSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            default: '',
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        _id: false,
    }
);

const CustomPageSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            default: '',
            trim: true,
        },
        label: {
            type: String,
            default: '',
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        content: {
            type: String,
            default: '',
            trim: true,
        },
        seoTitle: {
            type: String,
            default: '',
            trim: true,
        },
        seoDescription: {
            type: String,
            default: '',
            trim: true,
        },
        isEnabled: {
            type: Boolean,
            default: true,
        },
        showInFooter: {
            type: Boolean,
            default: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        _id: false,
    }
);

const SettingsSchema = new mongoose.Schema(
    {
        // Use a singleton pattern: there's only one settings doc, identified by this key
        singletonKey: {
            type: String,
            default: 'site-settings',
            unique: true,
        },

        // General Info
        storeName: {
            type: String,
            default: 'Ornaments by Arshad',
        },
        supportEmail: {
            type: String,
            default: 'support@ornamentsbyarshad.com',
        },
        businessAddress: {
            type: String,
            default: 'Luxury Jewelry Galleria, Karachi, Pakistan',
        },
        lightLogoUrl: {
            type: String,
            default: '',
        },
        darkLogoUrl: {
            type: String,
            default: '',
        },
        faviconUrl: {
            type: String,
            default: '',
        },
        faviconSizePx: {
            type: Number,
            default: 64,
            min: 32,
            max: 256,
        },
        logoScalePercent: {
            type: Number,
            default: 100,
            min: 60,
            max: 200,
        },
        emailLogoScalePercent: {
            type: Number,
            default: 100,
            min: 40,
            max: 200,
        },
        invoiceLogoScalePercent: {
            type: Number,
            default: 100,
            min: 40,
            max: 200,
        },

        // WhatsApp
        whatsappNumber: {
            type: String,
            default: '',
        },
        facebookPageUrl: {
            type: String,
            default: '',
        },
        instagramUrl: {
            type: String,
            default: '',
        },

        // Marketing / Tracking
        trackingEnabled: {
            type: Boolean,
            default: false,
        },
        facebookPixelId: {
            type: String,
            default: '',
        },
        facebookConversionsApiToken: {
            type: String,
            default: '',
        },
        facebookTestEventCode: {
            type: String,
            default: '',
        },
        tiktokPixelId: {
            type: String,
            default: '',
        },
        tiktokAccessToken: {
            type: String,
            default: '',
        },

        // Shipping Rates
        karachiDeliveryFee: {
            type: Number,
            default: 200,
        },
        outsideKarachiDeliveryFee: {
            type: Number,
            default: 300,
        },
        freeShippingThreshold: {
            type: Number,
            default: 5000,
        },

        // Banner / Notice
        announcementBarEnabled: {
            type: Boolean,
            default: true,
        },
        announcementBarText: {
            type: String,
            default: '',
        },
        announcementBarMessages: {
            type: [AnnouncementMessageSchema],
            default: [],
        },

        // Payment Methods
        bankDepositEnabled: {
            type: Boolean,
            default: false,
        },
        bankDepositAccountDetails: {
            type: String,
            default: '',
        },

        // Dynamically managed admin emails (in addition to ADMIN_EMAIL / ADMIN_EMAILS env vars)
        adminEmails: {
            type: [String],
            default: [],
        },
        homepageSectionOrder: {
            type: [String],
            default: [],
        },
        customPages: {
            type: [CustomPageSchema],
            default: [],
        },
        guestModeEnabled: {
            type: Boolean,
            default: true,
        },
        enableSecondaryNoc: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const cachedSettings = mongoose.models.Settings;
if (
    cachedSettings &&
    (
        !cachedSettings.schema.path('homepageSectionOrder') ||
        !cachedSettings.schema.path('announcementBarMessages') ||
        !cachedSettings.schema.path('lightLogoUrl') ||
        !cachedSettings.schema.path('darkLogoUrl') ||
        !cachedSettings.schema.path('faviconUrl') ||
        !cachedSettings.schema.path('faviconSizePx') ||
        !cachedSettings.schema.path('logoScalePercent') ||
        !cachedSettings.schema.path('emailLogoScalePercent') ||
        !cachedSettings.schema.path('invoiceLogoScalePercent') ||
        !cachedSettings.schema.path('customPages') ||
        !cachedSettings.schema.path('guestModeEnabled') ||
        !cachedSettings.schema.path('bankDepositEnabled') ||
        !cachedSettings.schema.path('bankDepositAccountDetails') ||
        !cachedSettings.schema.path('enableSecondaryNoc')
    )
) {
    delete mongoose.models.Settings;
}

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

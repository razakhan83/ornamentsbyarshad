import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

import mongooseConnect from '@/lib/mongooseConnect';
import { getSiteUrl } from '@/lib/siteUrl';
import Settings from '@/models/Settings';

const SETTINGS_KEY = 'site-settings';
const META_GRAPH_VERSION = 'v20.0';
const META_MISSING_CONFIG_REASON = 'missing_meta_config';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex');
}

function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

function sanitizeUserData(userData = {}) {
  const sanitized = {
    em: userData.email ? [sha256(userData.email)] : undefined,
    ph: userData.phone ? [sha256(normalizePhone(userData.phone))] : undefined,
    external_id: userData.externalId ? [sha256(userData.externalId)] : undefined,
    client_ip_address: userData.clientIp || undefined,
    client_user_agent: userData.clientUserAgent || undefined,
    fbp: userData.fbp || undefined,
    fbc: userData.fbc || undefined,
  };

  return Object.fromEntries(Object.entries(sanitized).filter(([, value]) => value !== undefined));
}

function buildContents(items) {
  return items.map((item) => ({
    id: String(item.productId || item.name || ''),
    quantity: Number(item.quantity || 1),
    item_price: Number(item.price || 0),
  }));
}

function resolveTrackingSiteUrl(siteUrl = '') {
  return String(siteUrl || '').trim() || getSiteUrl();
}

async function getTrackingSettings() {
  await mongooseConnect();

  const settings = await Settings.findOne({ singletonKey: SETTINGS_KEY }).lean();
  return {
    trackingEnabled: settings?.trackingEnabled === true,
    facebookPixelId: String(settings?.facebookPixelId || '').trim(),
    facebookConversionsApiToken: String(settings?.facebookConversionsApiToken || '').trim(),
    facebookTestEventCode: String(settings?.facebookTestEventCode || '').trim(),
    tiktokPixelId: String(settings?.tiktokPixelId || '').trim(),
    tiktokAccessToken: String(settings?.tiktokAccessToken || '').trim(),
  };
}

async function sendMetaEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData,
  customData,
  settings,
}) {
  if (!settings.facebookPixelId || !settings.facebookConversionsApiToken) {
    return {
      skipped: true,
      reason: META_MISSING_CONFIG_REASON,
    };
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: eventSourceUrl || getSiteUrl(),
        user_data: sanitizeUserData(userData),
        custom_data: customData,
      },
    ],
    test_event_code: settings.facebookTestEventCode || undefined,
  };

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${settings.facebookPixelId}/events?access_token=${encodeURIComponent(settings.facebookConversionsApiToken)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Meta tracking failed with ${response.status}: ${responseText}`);
  }

  return response.json().catch(() => ({ success: true }));
}

async function sendMetaPurchaseEventWithUserData({ order, items, settings, userData, siteUrl }) {
  const resolvedSiteUrl = resolveTrackingSiteUrl(siteUrl);

  return sendMetaEvent({
    eventName: 'Purchase',
    eventId: order.orderId,
    eventSourceUrl: `${resolvedSiteUrl}/checkout`,
    userData: {
      ...userData,
      email: order.customerEmail,
      phone: order.customerPhone,
      externalId: order.orderId,
    },
    customData: {
      currency: 'PKR',
      value: Number(order.totalAmount || 0),
      content_type: 'product',
      contents: buildContents(items),
      content_ids: items.map((item) => String(item.productId || item.name || '')).filter(Boolean),
    },
    settings,
  });
}

async function sendTikTokPurchaseEvent({ order, items, settings, siteUrl }) {
  if (!settings.tiktokPixelId || !settings.tiktokAccessToken) {
    return;
  }

  const resolvedSiteUrl = resolveTrackingSiteUrl(siteUrl);

  const payload = {
    event_source: 'web',
    event_source_id: settings.tiktokPixelId,
    data: [
      {
        event: 'CompletePayment',
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.orderId,
        page: {
          url: `${resolvedSiteUrl}/checkout`,
        },
        user: {
          email: order.customerEmail ? sha256(order.customerEmail) : undefined,
          phone_number: order.customerPhone ? sha256(normalizePhone(order.customerPhone)) : undefined,
          external_id: sha256(order.orderId),
        },
        properties: {
          currency: 'PKR',
          value: Number(order.totalAmount || 0),
          contents: buildContents(items).map((item) => ({
            content_id: item.id,
            quantity: item.quantity,
            price: item.item_price,
          })),
        },
      },
    ],
  };

  const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.tiktokAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`TikTok tracking failed with ${response.status}`);
  }
}

export async function sendPurchaseTrackingEvents({ order, items, userData = {}, siteUrl = '' }) {
  try {
    const settings = await getTrackingSettings();
    if (!settings.trackingEnabled) return;

    await Promise.allSettled([
      sendMetaPurchaseEventWithUserData({ order, items, settings, userData, siteUrl }),
      sendTikTokPurchaseEvent({ order, items, settings, siteUrl }),
    ]);
  } catch (error) {
    console.error('Tracking dispatch failed:', error);
  }
}

export async function sendMetaCustomTrackingEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData,
  customData,
}) {
  try {
    const settings = await getTrackingSettings();
    if (!settings.trackingEnabled) return { success: false, skipped: true };

    const cookieStore = await cookies();
    const fbp = cookieStore.get('_fbp')?.value;
    const fbc = cookieStore.get('_fbc')?.value;

    const response = await sendMetaEvent({
      eventName,
      eventId,
      eventSourceUrl,
      userData: {
        ...userData,
        fbp,
        fbc,
      },
      customData,
      settings,
    });

    if (response?.skipped) {
      return {
        success: false,
        skipped: true,
        reason: response.reason,
      };
    }

    return { success: true, response };
  } catch (error) {
    console.error(`Meta ${eventName} dispatch failed:`, error);
    return { success: false, error: error.message };
  }
}

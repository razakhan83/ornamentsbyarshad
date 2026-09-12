import mongooseConnect from '@/lib/mongooseConnect';
import { EMAIL_CID, cidSrc } from '@/lib/emailInlineAssets';
import { getSiteUrl } from '@/lib/siteUrl';
import Settings from '@/models/Settings';

const SETTINGS_KEY = 'site-settings';
const DEFAULT_BASE_URL = getSiteUrl();

const DEFAULT_BRANDING = {
  baseUrl: DEFAULT_BASE_URL,
  storeName: 'Ornaments by Arshad',
  supportEmail: 'support@ornamentsbyarshad.com',
  businessAddress: 'Luxury Jewelry Galleria, Karachi, Sindh, Pakistan',
  // Matches admin store-setup: lightLogoUrl is the light-colored mark for dark surfaces.
  lightLogoUrl: '',
  darkLogoUrl: '',
  emailLogoScalePercent: 100,
  facebookPageUrl: 'https://www.facebook.com/ornamentsbyarshad',
  instagramUrl: 'https://www.instagram.com/ornamentsbyarshad',
  whatsappNumber: '923000000000',
};

const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function getNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function formatCurrency(value) {
  return `Rs. ${getNumber(value).toLocaleString('en-PK')}`;
}

function formatDate(value, options = {}) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-PK', { dateStyle: 'medium', ...options });
}

function toAbsoluteEmailUrl(url, baseUrl = DEFAULT_BASE_URL) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) return '';
  if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;
  if (cleanUrl.startsWith('//')) return `https:${cleanUrl}`;
  
  let cleanBase = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  // When running locally, Gmail proxy cannot reach localhost, so use live production domain for emails
  if (/localhost|127\.0\.0\.1/i.test(cleanBase) || !cleanBase) {
    cleanBase = 'https://www.ornamentsbyarshad.com';
  }
  const cleanPath = cleanUrl.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
}

function getItems(order, baseUrl = DEFAULT_BASE_URL) {
  if (!Array.isArray(order?.items)) return [];

  return order.items.map((item, index) => {
    const quantity = Math.max(1, getNumber(item?.quantity, 1));
    const unitPrice = getNumber(item?.price);
    const rawImage = getText(item?.image || item?.Image || item?.imageUrl);

    return {
      name: getText(item?.name || item?.Name, `Item ${index + 1}`),
      image: toAbsoluteEmailUrl(rawImage, baseUrl),
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
}

function getPricing(order, items) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.max(getNumber(order?.totalAmount, subtotal), subtotal);
  const discountAmount = getNumber(order?.discountAmount, 0);
  const shipping = getNumber(order?.shippingAmount, Math.max(total - subtotal + discountAmount, 0));
  return { subtotal, shipping, discountAmount, total };
}

function buildOrderUrl(order, baseUrl = DEFAULT_BASE_URL) {
  const orderId = getText(order?._id);
  const secureToken = getText(order?.secureToken);

  if (orderId && secureToken) return `${baseUrl}/orders/${orderId}?token=${encodeURIComponent(secureToken)}`;
  if (orderId) return `${baseUrl}/orders/${orderId}`;
  return `${baseUrl}/orders`;
}

function getCleanAddressHtml(address, city, landmark, phone) {
  const cleanAddr = String(address || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanLandmark = String(landmark || '').trim();
  const cleanPhone = String(phone || '').trim();

  const lines = [];
  if (cleanAddr) lines.push(esc(cleanAddr));
  if (cleanCity && !cleanAddr.toLowerCase().includes(cleanCity.toLowerCase())) {
    lines.push(esc(cleanCity));
  }
  if (cleanLandmark) {
    lines.push(`Landmark: ${esc(cleanLandmark)}`);
  }
  if (cleanPhone && cleanPhone !== 'Not provided') {
    lines.push(`Phone: ${esc(cleanPhone)}`);
  }

  return lines.length > 0 ? lines.join('<br/>') : 'Address provided at checkout';
}

const DARK_BRAND_LOGO = '/logo.png';
const WHITE_BRAND_LOGO = '/logo.png';

function isWhiteWordmark(url) {
  return /logo-dark|white-logo|logo_white/i.test(String(url || ''));
}

function emailAsset(branding, relativePath, cid) {
  if (branding?.inlineImages && cid) return cidSrc(cid);
  return toAbsoluteEmailUrl(relativePath, branding.baseUrl);
}

function getLogoForEmailSurface(branding, surface = 'light') {
  const lightColored = getText(branding?.lightLogoUrl, WHITE_BRAND_LOGO);
  const darkColored = getText(branding?.darkLogoUrl, DARK_BRAND_LOGO);

  if (surface === 'dark') {
    if (isWhiteWordmark(lightColored)) return lightColored;
    if (isWhiteWordmark(darkColored)) return darkColored;
    return WHITE_BRAND_LOGO;
  }

  if (!isWhiteWordmark(darkColored)) return darkColored || DARK_BRAND_LOGO;
  if (!isWhiteWordmark(lightColored)) return lightColored || DARK_BRAND_LOGO;
  return DARK_BRAND_LOGO;
}

function renderSharedEmailStyles() {
  return `
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; max-width: 100%; }
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #e5ece8; font-family: ${FONT}; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) {
      .light-logo { display: none !important; max-height: 0 !important; overflow: hidden !important; }
      .dark-logo-wrap { display: block !important; max-height: none !important; overflow: visible !important; width: auto !important; float: none !important; visibility: visible !important; line-height: normal !important; }
      .dark-logo { display: block !important; }
    }
    [data-ogsc] .light-logo { display: none !important; max-height: 0 !important; overflow: hidden !important; }
    [data-ogsc] .dark-logo-wrap { display: block !important; max-height: none !important; overflow: visible !important; width: auto !important; float: none !important; visibility: visible !important; }
    [data-ogsc] .dark-logo { display: block !important; }
    [data-ogsb] .light-logo { display: none !important; }
    [data-ogsb] .dark-logo-wrap { display: block !important; max-height: none !important; overflow: visible !important; width: auto !important; visibility: visible !important; }
    [data-ogsb] .dark-logo { display: block !important; }
    @media only screen and (max-width: 620px) {
      .email-body { padding: 0 !important; width: 100% !important; }
      .email-outer { width: 100% !important; min-width: 100% !important; }
      .email-outer-cell { padding: 0 !important; }
      .main-table { width: 100% !important; max-width: 100% !important; min-width: 100% !important; border-radius: 0 !important; }
      .stack-col { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .stack-hide { display: none !important; }
      .stack-border-top { border-top: 1px solid #e2e8f0 !important; padding-top: 14px !important; margin-top: 6px !important; }
      .stack-gap { height: 12px !important; }
      .responsive-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-one-line, .mobile-order-num, .mobile-sub-1line, .admin-title-mobile, .admin-price-mobile, .delivered-title-mobile { white-space: normal !important; }
      .mobile-one-line, .delivered-title-mobile { font-size: 20px !important; line-height: 1.3 !important; }
      .admin-title-mobile { font-size: 18px !important; line-height: 1.3 !important; }
      .header-logo { width: 132px !important; max-width: 58% !important; height: auto !important; }
      .footer-logo { width: 96px !important; max-width: 42% !important; height: auto !important; }
      .fluid-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .social-icon { width: 22px !important; height: 22px !important; }
      .admin-items-table { width: 100% !important; table-layout: fixed !important; }
      .admin-item-name { word-break: break-word !important; white-space: normal !important; }
      .review-stars { font-size: 22px !important; letter-spacing: 3px !important; }
    }`;
}

function scaledLogoWidth(branding, baseWidth) {
  const percent = Math.min(200, Math.max(40, Number(branding?.emailLogoScalePercent || 100)));
  return Math.max(72, Math.round(baseWidth * (percent / 100)));
}

function renderBrandLogo(branding, { width, variant = 'header' } = {}) {
  const lightSrc = emailAsset(branding, getLogoForEmailSurface(branding, 'light'), EMAIL_CID.logoLight);
  const darkSrc = emailAsset(branding, getLogoForEmailSurface(branding, 'dark'), EMAIL_CID.logoDark);
  const storeName = esc(branding.storeName || 'Ornaments by Arshad');
  const storeUrl = branding.baseUrl || 'https://www.ornamentsbyarshad.com';
  const logoClass = variant === 'footer' ? 'footer-logo' : 'header-logo';
  const maxWidth = variant === 'footer' ? '48%' : '62%';
  const bottom = variant === 'footer' ? '10px' : '8px';

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" width="100%" style="margin: 0 auto ${bottom} auto;">
      <tr>
        <td align="center" style="padding: 0;">
          <a href="${esc(storeUrl)}" target="_blank" style="text-decoration: none; border: 0;">
            <img class="light-logo ${logoClass}" src="${esc(lightSrc)}" alt="${storeName}" width="${width}" style="display: block; width: ${width}px; max-width: ${maxWidth}; height: auto; margin: 0 auto; border: 0; outline: none;" />
            <!--[if !mso]><!-->
            <div class="dark-logo-wrap" style="display: none; overflow: hidden; float: left; width: 0; max-height: 0; line-height: 0; visibility: hidden; mso-hide: all;">
              <img class="dark-logo ${logoClass}" src="${esc(darkSrc)}" alt="${storeName}" width="${width}" style="display: none; width: ${width}px; max-width: ${maxWidth}; height: auto; margin: 0 auto; border: 0; outline: none;" />
            </div>
            <!--<![endif]-->
          </a>
        </td>
      </tr>
    </table>`;
}

function renderHeaderLogo(branding) {
  return renderBrandLogo(branding, { width: scaledLogoWidth(branding, 148), variant: 'header' });
}

function renderFooterLogo(branding) {
  return renderBrandLogo(branding, { width: scaledLogoWidth(branding, 108), variant: 'footer' });
}

function renderZigzag(branding, fillKey, backgroundColor) {
  const isGreen = fillKey === 'green';
  const src = emailAsset(
    branding,
    isGreen ? '/email-icons/zigzag-to-green.png' : '/email-icons/zigzag-to-white.png',
    isGreen ? EMAIL_CID.zigzagGreen : EMAIL_CID.zigzagWhite,
  );
  return `
          <tr>
            <td bgcolor="${backgroundColor}" style="font-size: 0; line-height: 0; background-color: ${backgroundColor}; padding: 0;">
              <img class="fluid-img" src="${esc(src)}" alt="" style="display: block; width: 100%; max-width: 100%; height: 16px; border: 0; outline: none;" />
            </td>
          </tr>`;
}

function renderCirclePngIcon(branding, iconPath, size = 16, cid) {
  const src = emailAsset(branding, iconPath, cid);
  return `<img src="${esc(src)}" width="${size}" height="${size}" alt="" style="display: block; margin: 0 auto; border: 0; outline: none;" />`;
}

function renderSocialIconCell(href, src, label) {
  return `
                  <td align="center" valign="middle" style="padding: 0 7px;">
                    <a href="${esc(href)}" target="_blank" style="text-decoration: none; border: 0;">
                      <img class="social-icon" src="${esc(src)}" width="22" height="22" alt="${esc(label)}" style="display: block; width: 22px; height: 22px; border: 0; outline: none;" />
                    </a>
                  </td>`;
}

function renderSocialIconRow(branding, { facebookUrl, instagramUrl, whatsappUrl, storeUrl }) {
  return `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  ${renderSocialIconCell(facebookUrl || 'https://www.facebook.com', emailAsset(branding, '/email-icons/facebook-green.png', EMAIL_CID.facebook), 'Facebook')}
                  ${renderSocialIconCell(instagramUrl || 'https://www.instagram.com', emailAsset(branding, '/email-icons/instagram-green.png', EMAIL_CID.instagram), 'Instagram')}
                  ${renderSocialIconCell(whatsappUrl, emailAsset(branding, '/email-icons/whatsapp-green.png', EMAIL_CID.whatsapp), 'WhatsApp')}
                  ${renderSocialIconCell(storeUrl, emailAsset(branding, '/email-icons/globe-green.png', EMAIL_CID.globe), 'Store')}
                </tr>
              </table>`;
}

export async function getEmailBranding() {
  try {
    await mongooseConnect();
    const settings = await Settings.findOne({ singletonKey: SETTINGS_KEY }).lean();
    if (!settings) return { ...DEFAULT_BRANDING };

    return {
      baseUrl: DEFAULT_BASE_URL,
      storeName: getText(settings.storeName, DEFAULT_BRANDING.storeName),
      supportEmail: getText(settings.supportEmail, DEFAULT_BRANDING.supportEmail),
      businessAddress: getText(settings.businessAddress, DEFAULT_BRANDING.businessAddress),
      lightLogoUrl: getText(settings.lightLogoUrl, DEFAULT_BRANDING.lightLogoUrl),
      darkLogoUrl: getText(settings.darkLogoUrl, DEFAULT_BRANDING.darkLogoUrl),
      emailLogoScalePercent: Math.min(200, Math.max(40, Number(settings.emailLogoScalePercent || 100))),
      facebookPageUrl: getText(settings.facebookPageUrl, DEFAULT_BRANDING.facebookPageUrl),
      instagramUrl: getText(settings.instagramUrl, DEFAULT_BRANDING.instagramUrl),
      whatsappNumber: getText(settings.whatsappNumber, DEFAULT_BRANDING.whatsappNumber),
    };
  } catch (error) {
    console.error('Failed to load email branding settings:', error);
    return { ...DEFAULT_BRANDING };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. CUSTOMER ORDER CONFIRMATION / THANK YOU EMAIL
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function generateCustomerOrderConfirmationHtml(order, brandingInput = {}) {
  const branding = { ...DEFAULT_BRANDING, ...brandingInput };
  const items = getItems(order, branding.baseUrl);
  const pricing = getPricing(order, items);
  const customerName = getText(order?.customerName, 'Valued Customer');
  const orderIdDisplay = getText(order?.orderId ? `#${order.orderId}` : '#CU-ORDER');
  const orderUrl = buildOrderUrl(order, branding.baseUrl);
  const orderDate = formatDate(order?.createdAt || new Date());
  const supportEmail = getText(branding?.supportEmail, 'support@ornamentsbyarshad.com');
  const rawPhoneDigits = getText(branding?.whatsappNumber || '923000000000').replace(/\D/g, '');
  const cleanWhatsAppNumber = rawPhoneDigits.startsWith('03') ? `92${rawPhoneDigits.slice(1)}` : rawPhoneDigits;
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}`;
  const storeUrl = branding.baseUrl || 'https://www.ornamentsbyarshad.com';
  const unsubscribeUrl = `${storeUrl}/unsubscribe`;

  const addressHtml = getCleanAddressHtml(order?.customerAddress, order?.customerCity, order?.landmark, order?.customerPhone);

  const itemsHtml = items.map((item) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px;">
      <tr>
        <td width="66" valign="middle">
          ${item.image 
            ? `<img src="${esc(item.image)}" width="58" height="58" alt="${esc(item.name)}" style="border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; object-fit: cover; display: block;" />`
            : `<div style="width: 58px; height: 58px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; text-align: center; line-height: 58px; font-size: 10px; color: #94a3b8; font-weight: 700;">ITEM</div>`
          }
        </td>
        <td valign="middle" style="padding-left: 12px; text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; word-break: break-word;">${esc(item.name)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">Qty: ${item.quantity} &bull; ${esc(formatCurrency(item.unitPrice))}</div>
          <div style="font-size: 13.5px; font-weight: 700; color: #064e3b; font-variant-numeric: tabular-nums;">${esc(formatCurrency(item.lineTotal))}</div>
        </td>
      </tr>
    </table>
  `).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(`Order Confirmation: ${orderIdDisplay} - ${branding.storeName}`)}</title>
  <style type="text/css">${renderSharedEmailStyles()}
  </style>
</head>
<body class="email-body" bgcolor="#e5ece8" style="margin: 0; padding: 12px 0; background-color: #e5ece8;">

  <table class="email-outer" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#e5ece8" style="width: 100%; min-width: 100%; background-color: #e5ece8;">
    <tr>
      <td class="email-outer-cell" align="center" style="padding: 0;">
        
        <!-- Main Email Container -->
        <table class="main-table" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#E3FCEF" style="max-width: 600px; width: 100%; background-color: #E3FCEF; border-radius: 14px; overflow: hidden; border: 1px solid #c7f2df;">
          
          <!-- SECTION 1: HEADER & ORDER DETAILS (LIGHT GREEN #E3FCEF) -->
          <tr>
            <td align="center" class="responsive-padding" style="padding: 28px 20px 20px 20px; background-color: #E3FCEF;">
              
              <!-- Clean Brand Header Logo (No Box) -->
              ${renderHeaderLogo(branding)}

              <!-- Main Heading: Single Line on Mobile -->
              <h1 class="mobile-one-line" style="margin: 14px 0 4px 0; color: #064e3b; font-size: 20px; font-weight: 800; line-height: 1.25; letter-spacing: -0.4px; white-space: normal; text-align: center;">
                Thank You for Your Order
              </h1>

              <!-- Order Number (Single Line on Mobile directly under title) -->
              <div class="mobile-order-num" style="font-size: 13.5px; font-weight: 800; color: #064e3b; margin: 0 auto 10px auto; text-align: center; white-space: normal; letter-spacing: 0.3px;">
                Order ${esc(orderIdDisplay)}
              </div>

              <!-- Subtitle Description: Single Line on Mobile -->
              <p class="mobile-sub-1line" style="margin: 0 auto 14px auto; max-width: 440px; color: #2d5a49; font-size: 13px; line-height: 1.35; text-align: center; white-space: normal;">
                Your order is confirmed &amp; being packed.
              </p>

              <!-- Track Order Button -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 24px; background-color: #064e3b;">
                    <a href="${esc(orderUrl)}" target="_blank" style="display: inline-block; padding: 11px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 24px;">
                      Track Your Order
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice note -->
              <p style="margin: 10px 0 18px 0; color: #52796a; font-size: 11.5px; text-align: center;">
                You can track your order directly on our website.
              </p>

              <!-- Info Card: Summary & Shipping Address -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #c7eedb;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Col 1: Summary -->
                        <td class="stack-col" width="48%" valign="top" style="text-align: left;">
                          <div style="font-size: 11px; font-weight: 800; color: #064e3b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Summary</div>
                          <div style="font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 4px;">Ready to Ship (COD)</div>
                          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${esc(orderIdDisplay)} &bull; ${esc(orderDate)}</div>
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums;">${esc(formatCurrency(pricing.total))}</div>
                        </td>

                        <!-- Divider for Desktop -->
                        <td class="stack-hide" width="4%" style="border-right: 1px solid #e2e8f0; font-size: 0;">&nbsp;</td>
                        <td class="stack-hide" width="4%" style="font-size: 0;">&nbsp;</td>

                        <!-- Col 2: Shipping Address -->
                        <td class="stack-col stack-border-top" width="44%" valign="top" style="text-align: left;">
                          <div style="font-size: 11px; font-weight: 800; color: #064e3b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</div>
                          <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">${esc(customerName)}</div>
                          <div style="font-size: 11px; line-height: 1.45; color: #475569;">
                            ${addressHtml}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${renderZigzag(branding, 'white', '#E3FCEF')}

          <!-- SECTION 2: WHITE BODY (ITEMS, TOTALS, CONTACT & GUARANTEE BOX) -->
          <tr>
            <td class="responsive-padding" style="padding: 24px 24px 24px 24px; background-color: #ffffff;">
              
              <h2 style="margin: 0; text-align: center; color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">
                Your items in this order
              </h2>
              
              <!-- Order ID Pill Badge -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 6px auto 18px auto;">
                <tr>
                  <td align="center" style="background-color: #f1fdf6; border: 1px solid #c7eedb; border-radius: 20px; padding: 3px 12px;">
                    <span style="color: #475569; font-size: 11px; font-weight: 600;">Order ID:</span>
                    <strong style="color: #064e3b; font-size: 12px; font-weight: 800; letter-spacing: 0.3px; margin-left: 4px;">${esc(orderIdDisplay)}</strong>
                  </td>
                </tr>
              </table>

              <!-- PRODUCT ITEMS LIST -->
              ${itemsHtml || `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 13px;">Items are being prepared.</div>`}

              <!-- PRICE BREAKDOWN TABLE -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #475569;">Subtotal</td>
                  <td align="right" style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums;">${esc(formatCurrency(pricing.subtotal))}</td>
                </tr>
                ${pricing.discountAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #059669;">Special Discount</td>
                  <td align="right" style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #059669; font-variant-numeric: tabular-nums;">-${esc(formatCurrency(pricing.discountAmount))}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; font-size: 12px; color: #475569;">Delivery</td>
                  <td align="right" style="padding: 4px 0; font-size: 12px; font-weight: 700; color: #059669; font-variant-numeric: tabular-nums;">${pricing.shipping > 0 ? esc(formatCurrency(pricing.shipping)) : 'FREE'}</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #e2e8f0; padding: 10px 0 0 0; font-size: 14px; font-weight: 800; color: #0f172a;">Total:</td>
                  <td align="right" style="border-top: 1px solid #e2e8f0; padding: 10px 0 0 0; font-size: 15px; font-weight: 800; color: #064e3b; font-variant-numeric: tabular-nums;">${esc(formatCurrency(pricing.total))}</td>
                </tr>
              </table>

              <!-- SUPPORT SECTION (Lucide SVG Icons) -->
              <h3 style="margin: 0 0 12px 0; text-align: center; color: #0f172a; font-size: 15px; font-weight: 700;">
                Any problems with your order?
              </h3>

              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <!-- Email Us Card (Lucide Mail Icon) -->
                  <td class="stack-col" width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="36" valign="middle">
                          <table border="0" cellpadding="0" cellspacing="0" width="32" height="32" style="border-collapse: separate !important; border-radius: 50% !important; background-color: #064e3b;">
                            <tr>
                              <td align="center" valign="middle" width="32" height="32" style="border-radius: 50%; padding: 0;">
                                ${renderCirclePngIcon(branding, '/email-icons/email-white.png', 16, EMAIL_CID.email)}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding-left: 8px; text-align: left;">
                          <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">Email Us</div>
                          <a href="mailto:${esc(supportEmail)}" style="font-size: 10px; color: #059669; text-decoration: none; font-weight: 600; word-break: break-all;">${esc(supportEmail)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td class="stack-col stack-gap" width="4%" style="font-size: 0;">&nbsp;</td>

                  <!-- Call / WhatsApp Card (Lucide Phone Icon) -->
                  <td class="stack-col" width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="36" valign="middle">
                          <table border="0" cellpadding="0" cellspacing="0" width="32" height="32" style="border-collapse: separate !important; border-radius: 50% !important; background-color: #064e3b;">
                            <tr>
                              <td align="center" valign="middle" width="32" height="32" style="border-radius: 50%; padding: 0;">
                                ${renderCirclePngIcon(branding, '/email-icons/phone-white.png', 16, EMAIL_CID.phone)}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding-left: 8px; text-align: left;">
                          <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">Call / WhatsApp</div>
                          <a href="${esc(whatsappUrl)}" style="font-size: 10px; color: #059669; text-decoration: none; font-weight: 600;">+92 ${esc(cleanWhatsAppNumber.replace(/^92/, ''))}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 100% Quality & 7-Day Easy Return Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #E3FCEF; border: 1px solid #c7f2df; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 20px 16px;">
                    <div style="color: #064e3b; font-size: 15px; font-weight: 800; margin-bottom: 4px;">
                      100% Quality &amp; 7-Day Easy Return
                    </div>
                    <p style="margin: 0 auto 14px auto; max-width: 400px; color: #2d5a49; font-size: 11.5px; line-height: 1.45;">
                      All items are inspected before dispatch. 7-Day easy replacement guarantee across Pakistan.
                    </p>

                    <!-- Centered Visit Store Button -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="background-color: #064e3b; border-radius: 20px;">
                          <a href="${esc(storeUrl)}" target="_blank" style="display: inline-block; padding: 9px 26px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 20px; letter-spacing: 0.2px;">
                            Visit Official Store &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- SECTION 3: B2B SECTION (PURE WHITE BACKGROUND WITH LUCIDE MESSAGE ICON) -->
          <tr>
            <td class="responsive-padding" style="padding: 18px 22px; background-color: #ffffff; border-top: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="44" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0" width="34" height="34" style="border-collapse: separate !important; border-radius: 50% !important; background-color: #064e3b;">
                      <tr>
                        <td align="center" valign="middle" width="34" height="34" style="border-radius: 50%; padding: 0;">
                          ${renderCirclePngIcon(branding, '/email-icons/chat-white.png', 16, EMAIL_CID.chat)}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 8px; text-align: left;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
                      Want to talk business with us?
                    </div>
                    <div style="font-size: 11px; line-height: 1.4; color: #475569;">
                      Bespoke orders, bridal sets &amp; consultations: <a href="mailto:concierge@ornamentsbyarshad.com" style="color: #a67c52; font-weight: 700; text-decoration: none;">concierge@ornamentsbyarshad.com</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${renderZigzag(branding, 'green', '#ffffff')}

          <!-- SECTION 4: FOOTER (LIGHT GREEN #E3FCEF WITH LUCIDE SOCIAL ICONS) -->
          <tr>
            <td align="center" style="padding: 22px 18px 20px 18px; background-color: #fcfbf9;">
              
              <!-- Clean Footer Logo (No Box) -->
              ${renderFooterLogo(branding)}

              ${renderSocialIconRow(branding, {
                facebookUrl: branding.facebookPageUrl,
                instagramUrl: branding.instagramUrl,
                whatsappUrl,
                storeUrl,
              })}

              <!-- Postal Address -->
              <div style="font-size: 11px; line-height: 1.5; color: #786f66; margin-bottom: 8px;">
                ${esc(branding.businessAddress || 'Luxury Jewelry Galleria, Karachi, Sindh, Pakistan')}<br/>
                Insured Nationwide Delivery &amp; Certified Authenticity
              </div>

              <!-- Unsubscribe Link -->
              <div>
                <a href="${esc(unsubscribeUrl)}" target="_blank" style="font-size: 11px; font-weight: 700; color: #064e3b; text-decoration: underline;">
                  Unsubscribe
                </a>
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. ADMIN NEW ORDER NOTIFICATION EMAIL
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function generateOrderEmailHtml(order, brandingInput = {}) {
  const branding = { ...DEFAULT_BRANDING, ...brandingInput };
  const items = getItems(order, branding.baseUrl);
  const pricing = getPricing(order, items);
  const orderIdDisplay = getText(order?.orderId ? `#${order.orderId}` : '#CU-ORDER');
  const adminUrl = order?._id 
    ? `${branding.baseUrl}/admin/orders/${order._id}`
    : `${branding.baseUrl}/admin/orders`;
  const customerName = getText(order?.customerName, 'Customer');
  const customerPhone = getText(order?.customerPhone, 'Not provided');
  const rawPhoneDigits = customerPhone.replace(/\D/g, '');
  const cleanPhoneForWhatsApp = rawPhoneDigits.startsWith('03') ? `92${rawPhoneDigits.slice(1)}` : rawPhoneDigits;
  const whatsappUrl = rawPhoneDigits ? `https://wa.me/${cleanPhoneForWhatsApp}` : '';
  const phoneCallUrl = rawPhoneDigits ? `tel:${customerPhone}` : '';
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addressHtml = getCleanAddressHtml(order?.customerAddress, order?.customerCity, order?.landmark, '');

  const productRowsHtml = items.map((item) => `
    <tr>
      <td class="admin-item-name" style="padding: 9px 10px; border-top: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 600; color: #0f172a; word-break: break-word; white-space: normal;">
        ${esc(item.name)}
      </td>
      <td align="center" style="padding: 9px 6px; border-top: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 800; color: #0f172a;">
        ${item.quantity}x
      </td>
      <td align="right" style="padding: 9px 10px; border-top: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 700; color: #064e3b; font-variant-numeric: tabular-nums;">
        ${esc(formatCurrency(item.lineTotal))}
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(`Admin Alert: New Order ${orderIdDisplay} - ${customerName}`)}</title>
  <style type="text/css">${renderSharedEmailStyles()}
  </style>
</head>
<body class="email-body" bgcolor="#e5ece8" style="margin: 0; padding: 12px 0; background-color: #e5ece8;">

  <table class="email-outer" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#e5ece8" style="width: 100%; min-width: 100%; background-color: #e5ece8;">
    <tr>
      <td class="email-outer-cell" align="center" style="padding: 0;">
        
        <!-- Clean Admin Container -->
        <table class="main-table" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#E3FCEF" style="max-width: 600px; width: 100%; background-color: #E3FCEF; border-radius: 14px; overflow: hidden; border: 1px solid #c7f2df;">
          
          <!-- SECTION 1: CLEAN HEADER -->
          <tr>
            <td align="center" class="responsive-padding" style="padding: 22px 16px 14px 16px; background-color: #E3FCEF;">
              
              <!-- Clean Brand Header Logo (No Box) -->
              ${renderHeaderLogo(branding)}

              <div style="display: inline-block; margin-top: 6px; margin-bottom: 2px; padding: 2px 7px; background-color: #ffffff; border: 1px solid #c7eedb; border-radius: 12px; font-size: 9.5px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px;">
                Order Received
              </div>

              <h1 class="admin-title-mobile" style="margin: 2px 0 3px 0; color: #064e3b; font-size: 16px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; text-align: center; white-space: normal;">
                Order ${esc(orderIdDisplay)}
              </h1>

              <div class="admin-price-mobile" style="font-size: 12.5px; font-weight: 800; color: #0f172a; margin-bottom: 10px; font-variant-numeric: tabular-nums; text-align: center; white-space: normal;">
                ${esc(formatCurrency(pricing.total))} &nbsp;&bull;&nbsp; <span style="font-size: 10px; font-weight: 700; color: #059669; background: #ffffff; padding: 1px 5px; border-radius: 4px; border: 1px solid #c7eedb; vertical-align: middle;">Cash on Delivery</span>
              </div>

              <!-- Open in Dashboard Button -->
              <table border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center" style="border-radius: 18px; background-color: #064e3b;">
                    <a href="${esc(adminUrl)}" target="_blank" class="admin-btn-mobile" style="display: inline-block; padding: 8px 22px; font-size: 11.5px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 18px; letter-spacing: 0.2px;">
                      Open in Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${renderZigzag(branding, 'white', '#E3FCEF')}

          <!-- SECTION 2: CLEAN DETAILS BODY -->
          <tr>
            <td class="responsive-padding" style="padding: 16px 16px 18px 16px; background-color: #ffffff;">
              
              <!-- Customer & Address Grid -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 14px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Col 1: Customer -->
                        <td class="stack-col" width="48%" valign="top" style="text-align: left;">
                          <div style="font-size: 10px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Customer Details</div>
                          <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${esc(customerName)}</div>
                          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
                            Phone: <a href="${esc(phoneCallUrl || '#')}" style="color: #064e3b; font-weight: 700; text-decoration: underline;">${esc(customerPhone)}</a>
                          </div>
                          ${whatsappUrl ? `
                          <div style="font-size: 11px; color: #64748b;">
                            WhatsApp: <a href="${esc(whatsappUrl)}" target="_blank" style="color: #059669; font-weight: 700; text-decoration: underline;">Chat with Customer</a>
                          </div>` : ''}
                        </td>

                        <!-- Divider -->
                        <td class="stack-hide" width="4%" style="border-right: 1px solid #e2e8f0; font-size: 0;">&nbsp;</td>
                        <td class="stack-hide" width="4%" style="font-size: 0;">&nbsp;</td>

                        <!-- Col 2: Destination -->
                        <td class="stack-col stack-border-top" width="44%" valign="top" style="text-align: left;">
                          <div style="font-size: 10px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">Shipping Address</div>
                          <div style="font-size: 11px; line-height: 1.45; color: #0f172a;">
                            ${addressHtml}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Items List Heading -->
              <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                Ordered Products (${itemCount} Item${itemCount !== 1 ? 's' : ''})
              </div>

              <!-- Compact Clean Table -->
              <table class="admin-items-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; table-layout: fixed; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 14px;">
                <tr style="background-color: #f8fafc;">
                  <th align="left" width="62%" style="padding: 6px 8px; font-size: 10.5px; color: #475569; font-weight: 700; text-transform: uppercase;">Item</th>
                  <th align="center" width="14%" style="padding: 6px 4px; font-size: 10.5px; color: #475569; font-weight: 700; text-transform: uppercase;">Qty</th>
                  <th align="right" width="24%" style="padding: 6px 8px; font-size: 10.5px; color: #475569; font-weight: 700; text-transform: uppercase;">Amount</th>
                </tr>
                ${productRowsHtml || `<tr><td colspan="3" style="padding: 8px; text-align: center; color: #64748b; font-size: 11px;">No items recorded.</td></tr>`}
              </table>

              <!-- Totals -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 2px 0; font-size: 11px; color: #64748b;">Subtotal</td>
                  <td align="right" style="padding: 2px 0; font-size: 11px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">${esc(formatCurrency(pricing.subtotal))}</td>
                </tr>
                ${pricing.discountAmount > 0 ? `
                <tr>
                  <td style="padding: 2px 0; font-size: 11px; color: #059669;">Discount</td>
                  <td align="right" style="padding: 2px 0; font-size: 11px; font-weight: 700; color: #059669; font-variant-numeric: tabular-nums;">-${esc(formatCurrency(pricing.discountAmount))}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 2px 0; font-size: 11px; color: #059669;">Delivery Fee</td>
                  <td align="right" style="padding: 2px 0; font-size: 11px; font-weight: 700; color: #059669; font-variant-numeric: tabular-nums;">${pricing.shipping > 0 ? esc(formatCurrency(pricing.shipping)) : 'FREE'}</td>
                </tr>
                <tr>
                  <td style="border-top: 1px solid #e2e8f0; padding: 6px 0 0 0; font-size: 12.5px; font-weight: 800; color: #0f172a;">Total Collectible (COD):</td>
                  <td align="right" style="border-top: 1px solid #e2e8f0; padding: 6px 0 0 0; font-size: 13.5px; font-weight: 800; color: #064e3b; font-variant-numeric: tabular-nums;">${esc(formatCurrency(pricing.total))}</td>
                </tr>
              </table>

            </td>
          </tr>

          ${renderZigzag(branding, 'green', '#ffffff')}

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding: 14px 16px; background-color: #E3FCEF;">
              <div style="font-size: 10.5px; font-weight: 700; color: #064e3b;">
                ${esc(branding.businessAddress || 'Ornaments by Arshad Atelier, Karachi, Sindh, Pakistan')}
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. CUSTOMER ORDER DELIVERED / REVIEW INVITATION EMAIL
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function generateCustomerOrderDeliveredHtml(order, brandingInput = {}) {
  const branding = { ...DEFAULT_BRANDING, ...brandingInput };
  const items = getItems(order, branding.baseUrl);
  const orderIdDisplay = getText(order?.orderId ? `#${order.orderId}` : '#OBA-ORDER');
  const orderUrl = buildOrderUrl(order, branding.baseUrl);
  const storeUrl = branding.baseUrl || 'https://www.ornamentsbyarshad.com';
  const unsubscribeUrl = `${storeUrl}/unsubscribe`;
  const rawPhoneDigits = getText(branding?.whatsappNumber || '923000000000').replace(/\D/g, '');
  const cleanWhatsAppNumber = rawPhoneDigits.startsWith('03') ? `92${rawPhoneDigits.slice(1)}` : rawPhoneDigits;
  const issueWhatsAppUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(`Salam, I have an inquiry regarding Order ${orderIdDisplay}`)}`;
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}`;

  const deliveredItemsHtml = items.map((item) => `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px;">
      <tr>
        <td width="60" valign="middle">
          ${item.image 
            ? `<img src="${esc(item.image)}" width="52" height="52" alt="${esc(item.name)}" style="border-radius: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; object-fit: cover; display: block;" />`
            : `<div style="width: 52px; height: 52px; border-radius: 8px; background-color: #ffffff; border: 1px solid #e2e8f0; text-align: center; line-height: 52px; font-size: 10px; color: #94a3b8; font-weight: 700;">ITEM</div>`
          }
        </td>
        <td valign="middle" style="padding-left: 12px; text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; word-break: break-word;">${esc(item.name)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Qty: ${item.quantity} &bull; ${esc(formatCurrency(item.unitPrice))}</div>
          <a href="${esc(orderUrl)}" target="_blank" style="display: inline-block; font-size: 11.5px; font-weight: 700; color: #064e3b; text-decoration: underline;">
            Rate This Item &rarr;
          </a>
        </td>
      </tr>
    </table>
  `).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(`Your Order Has Been Delivered: ${orderIdDisplay} - ${branding.storeName}`)}</title>
  <style type="text/css">${renderSharedEmailStyles()}
  </style>
</head>
<body class="email-body" bgcolor="#e5ece8" style="margin: 0; padding: 12px 0; background-color: #e5ece8;">

  <table class="email-outer" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#e5ece8" style="width: 100%; min-width: 100%; background-color: #e5ece8;">
    <tr>
      <td class="email-outer-cell" align="center" style="padding: 0;">
        
        <!-- Main Email Container -->
        <table class="main-table" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#E3FCEF" style="max-width: 600px; width: 100%; background-color: #E3FCEF; border-radius: 14px; overflow: hidden; border: 1px solid #c7f2df;">
          
          <!-- SECTION 1: HEADER & DELIVERY CELEBRATION (LIGHT GREEN #E3FCEF) -->
          <tr>
            <td align="center" class="responsive-padding" style="padding: 28px 20px 20px 20px; background-color: #E3FCEF;">
              
              <!-- Clean Brand Header Logo (No Box) -->
              ${renderHeaderLogo(branding)}

              <!-- Main Heading: Single Line on Mobile -->
              <h1 class="delivered-title-mobile" style="margin: 14px 0 4px 0; color: #064e3b; font-size: 20px; font-weight: 800; line-height: 1.25; letter-spacing: -0.4px; white-space: normal; text-align: center;">
                Your Order Has Been Delivered!
              </h1>

              <!-- Order Number Badge -->
              <div class="mobile-order-num" style="font-size: 13.5px; font-weight: 800; color: #064e3b; margin: 0 auto 10px auto; text-align: center; white-space: normal; letter-spacing: 0.3px;">
                Order ${esc(orderIdDisplay)}
              </div>

              <!-- Subtitle Description -->
              <p style="margin: 0 auto 14px auto; max-width: 440px; color: #2d5a49; font-size: 13px; line-height: 1.45; text-align: center;">
                We hope you love your package! How was your unboxing experience?
              </p>

              <!-- Star Rating Bar Link (Universal Gold Stars) -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <a class="review-stars" href="${esc(orderUrl)}?rating=5" target="_blank" style="text-decoration: none; font-size: 26px; line-height: 1; color: #f59e0b; letter-spacing: 4px; font-weight: 900; display: inline-block;">
                      &#9733;&#9733;&#9733;&#9733;&#9733;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA: Write a Review Button -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center" style="border-radius: 24px; background-color: #064e3b;">
                    <a href="${esc(orderUrl)}" target="_blank" style="display: inline-block; padding: 11px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 24px;">
                      Rate &amp; Write a Review
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Special Review Experience Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #c7eedb;">
                <tr>
                  <td style="padding: 12px 16px; text-align: left;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="36" valign="middle">
                          <table border="0" cellpadding="0" cellspacing="0" width="32" height="32" style="border-collapse: separate !important; border-radius: 50% !important; background-color: #064e3b;">
                            <tr>
                              <td align="center" valign="middle" width="32" height="32" style="border-radius: 50%; color: #ffffff; font-size: 14px; font-weight: 800; text-align: center; line-height: 32px; padding: 0;">
                                &#128077;
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding-left: 10px; text-align: left;">
                          <div style="font-size: 12px; font-weight: 800; color: #064e3b; margin-bottom: 2px;">
                            Review Your Experience
                          </div>
                          <div style="font-size: 10.5px; color: #475569; line-height: 1.4;">
                            Review your experience — it helps other shoppers make the right choice!
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${renderZigzag(branding, 'white', '#E3FCEF')}

          <!-- SECTION 2: WHITE BODY (DELIVERED ITEMS & REVIEW ACTIONS) -->
          <tr>
            <td class="responsive-padding" style="padding: 24px 24px 24px 24px; background-color: #ffffff;">
              
              <h2 style="margin: 0 0 4px 0; text-align: center; color: #0f172a; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">
                Delivered Items in Your Package
              </h2>
              <p style="margin: 0 0 18px 0; text-align: center; color: #64748b; font-size: 11.5px;">
                Select a product below to submit your rating:
              </p>

              <!-- DELIVERED ITEMS LIST -->
              ${deliveredItemsHtml || `<div style="padding: 14px; text-align: center; color: #64748b; font-size: 13px;">No items listed.</div>`}

              <!-- 7-DAY REPLACEMENT / ISSUE REPORT CARD (#E3FCEF) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #E3FCEF; border: 1px solid #c7f2df; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 18px 16px;">
                    <div style="color: #064e3b; font-size: 15px; font-weight: 800; margin-bottom: 4px;">
                      Got an issue with your parcel?
                    </div>
                    <p style="margin: 0 auto 14px auto; max-width: 400px; color: #2d5a49; font-size: 11.5px; line-height: 1.45;">
                      If anything arrived damaged or missing, you are covered by our <strong>7-Day Free Replacement Guarantee</strong>.
                    </p>

                    <table border="0" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td align="center" style="background-color: #064e3b; border-radius: 20px;">
                          <a href="${esc(issueWhatsAppUrl)}" target="_blank" style="display: block; padding: 9px 24px; font-size: 12px; font-weight: 700; color: #ffffff; text-decoration: none;">
                            WhatsApp Support for Replacement
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- SECTION 3: B2B SECTION (PURE WHITE BACKGROUND WITH LUCIDE MESSAGE ICON) -->
          <tr>
            <td class="responsive-padding" style="padding: 18px 22px; background-color: #ffffff; border-top: 1px solid #f1f5f9;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="44" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0" width="34" height="34" style="border-collapse: separate !important; border-radius: 50% !important; background-color: #064e3b;">
                      <tr>
                        <td align="center" valign="middle" width="34" height="34" style="border-radius: 50%; padding: 0;">
                          ${renderCirclePngIcon(branding, '/email-icons/chat-white.png', 16, EMAIL_CID.chat)}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 8px; text-align: left;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
                      Want to talk business with us?
                    </div>
                    <div style="font-size: 11px; line-height: 1.4; color: #475569;">
                      Bespoke orders, bridal sets &amp; consultations: <a href="mailto:concierge@ornamentsbyarshad.com" style="color: #a67c52; font-weight: 700; text-decoration: none;">concierge@ornamentsbyarshad.com</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${renderZigzag(branding, 'green', '#ffffff')}

          <!-- SECTION 4: FOOTER (LIGHT GREEN #E3FCEF WITH LUCIDE SOCIAL ICONS) -->
          <tr>
            <td align="center" style="padding: 22px 18px 20px 18px; background-color: #fcfbf9;">
              
              <!-- Clean Footer Logo (No Box) -->
              ${renderFooterLogo(branding)}

              ${renderSocialIconRow(branding, {
                facebookUrl: branding.facebookPageUrl,
                instagramUrl: branding.instagramUrl,
                whatsappUrl,
                storeUrl,
              })}

              <!-- Postal Address -->
              <div style="font-size: 11px; line-height: 1.5; color: #786f66; margin-bottom: 8px;">
                ${esc(branding.businessAddress || 'Luxury Jewelry Galleria, Karachi, Sindh, Pakistan')}<br/>
                Insured Nationwide Delivery &amp; Certified Authenticity
              </div>

              <!-- Unsubscribe Link -->
              <div>
                <a href="${esc(unsubscribeUrl)}" target="_blank" style="font-size: 11px; font-weight: 700; color: #064e3b; text-decoration: underline;">
                  Unsubscribe
                </a>
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

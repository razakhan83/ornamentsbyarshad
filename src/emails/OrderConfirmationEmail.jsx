import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

import { normalizeSocialUrl } from '@/lib/social';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

/* ═══════════════════════════════════════════════════════════════════════════
   Theme — unified palette
   ═══════════════════════════════════════════════════════════════════════════ */

const t = {
  page: '#f4f2ee',
  card: '#ffffff',
  panel: '#f7f8f7',
  border: '#e0e4e1',
  borderSoft: '#ebeeed',
  text: '#18201c',
  textSecondary: '#374740',
  muted: '#5e6e66',
  light: '#94a39b',
  accent: '#0f766e',
  accentDark: '#0a5a54',
  accentTint: '#e7f5f1',
  accentBadge: '#d1fae5',
  white: '#ffffff',
  goldTint: '#faf6ec',
  goldBorder: '#ead8b4',
  goldText: '#725426',
  goldLabel: '#9a6b11',
};

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

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

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildOrderUrl(order, baseUrl) {
  const orderId = getText(order?._id);
  const secureToken = getText(order?.secureToken);
  if (orderId && secureToken) return `${baseUrl}/orders/${orderId}?token=${encodeURIComponent(secureToken)}`;
  if (orderId) return `${baseUrl}/orders/${orderId}`;
  return `${baseUrl}/orders`;
}

function getOptimizedEmailImage(url) {
  const source = getText(url);
  if (!source) return '';
  return optimizeCloudinaryUrl(source, {
    width: 128,
    height: 128,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'jpg',
    includeDpr: false,
  });
}

function getItems(order) {
  if (!Array.isArray(order?.items)) return [];
  return order.items.map((item, index) => {
    const quantity = Math.max(1, getNumber(item?.quantity, 1));
    const unitPrice = getNumber(item?.price);
    return {
      id: `${item?.productId || item?.name || 'item'}-${index}`,
      name: getText(item?.name || item?.Name, `Item ${index + 1}`),
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      image: getOptimizedEmailImage(item?.image || item?.Image || item?.imageUrl),
    };
  });
}

function getPricing(order, items) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.max(getNumber(order?.totalAmount, subtotal), subtotal);
  const shipping = Math.max(total - subtotal, 0);
  return { subtotal, shipping, total };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components — all single-column, fully mobile safe
   ═══════════════════════════════════════════════════════════════════════════ */

function InfoRow({ label, value }) {
  return (
    <Text style={s.infoRow}>
      <span style={s.infoLabel}>{label}: </span>
      <span style={s.infoValue}>{value}</span>
    </Text>
  );
}

function ProductRow({ item }) {
  return (
    <Section style={s.productRow}>
      {/* Product image on its own line — prevents text cramping */}
      {item.image ? (
        <Img src={item.image} alt={item.name} width="56" height="56" style={s.productImg} />
      ) : null}
      <Text style={s.productName}>{item.name}</Text>
      <Text style={s.productMeta}>
        Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
      </Text>
      <Text style={s.productTotal}>{formatCurrency(item.lineTotal)}</Text>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Email Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function OrderConfirmationEmail({ order, branding }) {
  const customerName = getText(order?.customerName, 'Customer');
  const firstName = customerName.split(/\s+/)[0] || customerName;
  const orderId = getText(order?.orderId, 'Pending');
  const orderDate = formatDate(order?.createdAt);
  const orderUrl = buildOrderUrl(order, branding?.baseUrl);
  const items = getItems(order);
  const pricing = getPricing(order, items);
  const logoUrl = getText(branding?.darkLogoUrl || branding?.lightLogoUrl);
  const supportEmail = getText(branding?.supportEmail);
  const whatsappUrl = createWhatsAppUrl(branding?.whatsappNumber);
  const shippingAddress = getText(order?.customerAddress, 'Will be confirmed.');
  const customerCity = getText(order?.customerCity);
  const customerPhone = getText(order?.customerPhone);
  const landmark = getText(order?.landmark);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemSummary = itemCount === 1 ? '1 item' : `${itemCount} items`;

  const footerLinks = [
    { href: normalizeSocialUrl(branding?.facebookPageUrl), label: 'Facebook' },
    { href: normalizeSocialUrl(branding?.instagramUrl), label: 'Instagram' },
    { href: whatsappUrl, label: 'WhatsApp' },
  ].filter((l) => l.href);

  return (
    <Html>
      <Head />
      <Preview>{`Order ${orderId} confirmed — ${itemSummary}`}</Preview>
      <Body style={s.body}>
        <Container style={s.outer}>
          <Section style={s.card}>

            {/* ─── Logo ──────────────────────────────────────── */}
            {logoUrl ? (
              <Section style={s.logoWrap}>
                <Img src={logoUrl} alt={branding?.storeName || 'Store'} width="280" style={s.logo} />
              </Section>
            ) : null}

            {/* ─── Hero ──────────────────────────────────────── */}
            <Section style={s.hero}>
              <Text style={s.heroCheck}>✓</Text>
              <Text style={s.heroKicker}>ORDER CONFIRMED</Text>
              <Heading as="h1" style={s.heroTitle}>Thank you, {firstName}!</Heading>
              <Text style={s.heroSub}>
                Your order is in and we&apos;re getting it ready. We&apos;ll update you as it moves to dispatch.
              </Text>
            </Section>

            {/* ─── Progress bar (single row, no columns) ─────── */}
            <Section style={s.progressWrap}>
              <Text style={s.progressBar}>
                <span style={s.progressStepActive}>● Confirmed</span>
                <span style={s.progressDivider}>&nbsp;&nbsp;→&nbsp;&nbsp;</span>
                <span style={s.progressStep}>Preparing</span>
                <span style={s.progressDivider}>&nbsp;&nbsp;→&nbsp;&nbsp;</span>
                <span style={s.progressStep}>Dispatched</span>
              </Text>
            </Section>

            {/* ─── Order info (stacked rows, not columns) ───── */}
            <Section style={s.infoBlock}>
              <InfoRow label="Order ID" value={orderId} />
              <InfoRow label="Date" value={orderDate} />
              <InfoRow label="Items" value={itemSummary} />
              <InfoRow label="Payment" value={getText(order?.paymentStatus, 'COD')} />
            </Section>

            {/* ─── Products ──────────────────────────────────── */}
            <Section style={s.productsBlock}>
              <Text style={s.sectionTitle}>Your order</Text>

              {items.length > 0 ? (
                items.map((item) => <ProductRow key={item.id} item={item} />)
              ) : (
                <Text style={s.emptyText}>Order details were unavailable.</Text>
              )}

              {/* Pricing */}
              <Section style={s.pricingBox}>
                <Text style={s.pricingRow}>
                  <span>Subtotal</span>
                  <span style={s.pricingVal}>{formatCurrency(pricing.subtotal)}</span>
                </Text>
                <Text style={s.pricingRow}>
                  <span>Shipping</span>
                  <span style={s.pricingVal}>{formatCurrency(pricing.shipping)}</span>
                </Text>
                <Hr style={s.pricingHr} />
                <Text style={s.pricingTotalRow}>
                  <span>Total</span>
                  <span style={s.pricingTotalVal}>{formatCurrency(pricing.total)}</span>
                </Text>
              </Section>
            </Section>

            {/* ─── Delivery Details ──────────────────────────── */}
            <Section style={s.deliveryBlock}>
              <Text style={s.deliveryLabel}>DELIVERY DETAILS</Text>
              <Text style={s.deliveryLine}>{shippingAddress}</Text>
              {customerCity ? <Text style={s.deliveryLine}>{customerCity}</Text> : null}
              {landmark ? <Text style={s.deliveryLine}>Landmark: {landmark}</Text> : null}
              {customerPhone ? <Text style={s.deliveryLine}>Phone: {customerPhone}</Text> : null}
            </Section>

            {/* ─── What happens next ─────────────────────────── */}
            <Section style={s.nextBlock}>
              <Text style={s.nextTitle}>What happens next</Text>
              <Text style={s.nextStep}><span style={s.nextNum}>1.</span> We review your order and confirm stock.</Text>
              <Text style={s.nextStep}><span style={s.nextNum}>2.</span> We prepare your package and update tracking.</Text>
              <Text style={s.nextStep}><span style={s.nextNum}>3.</span> Tap below anytime to check your order.</Text>
            </Section>

            {/* ─── CTA ───────────────────────────────────────── */}
            <Section style={s.ctaWrap}>
              <Link href={orderUrl} style={s.ctaBtn}>View Order Details</Link>
            </Section>

            {/* ─── Support ───────────────────────────────────── */}
            <Section style={s.supportWrap}>
              <Text style={s.supportText}>
                Need help?{' '}
                {supportEmail ? (
                  <>Email <Link href={`mailto:${supportEmail}`} style={s.link}>{supportEmail}</Link></>
                ) : 'Reply to this email.'}
              </Text>
            </Section>

            <Hr style={s.footerHr} />

            {/* ─── Footer ────────────────────────────────────── */}
            <Section style={s.footer}>
              <Text style={s.footerStore}>{branding?.storeName || 'Ornaments by Arshad'}</Text>
              {footerLinks.length > 0 ? (
                <Text style={s.footerLinks}>
                  {footerLinks.map((item, i) => (
                    <span key={item.label}>
                      {i > 0 ? ' · ' : ''}
                      <Link href={item.href} style={s.link}>{item.label}</Link>
                    </span>
                  ))}
                </Text>
              ) : null}
              <Text style={s.footerDisclaimer}>
                You received this because you placed an order. Thank you for your trust.
              </Text>
            </Section>

          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Styles — everything single-column, no inline-block tricks
   ═══════════════════════════════════════════════════════════════════════════ */

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

const s = {
  body: {
    backgroundColor: t.page,
    margin: 0,
    padding: '16px 8px',
    fontFamily: font,
    color: t.text,
    WebkitTextSizeAdjust: '100%',
  },
  outer: { maxWidth: '520px', margin: '0 auto' },
  card: {
    backgroundColor: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: '16px',
    overflow: 'hidden',
  },

  // Logo
  logoWrap: {
    padding: '24px 20px 4px',
    textAlign: 'center',
  },
  logo: {
    margin: '0 auto',
    width: '280px',
    maxWidth: '280px',
    maxHeight: '96px',
    height: 'auto',
  },

  // Hero
  hero: { padding: '20px 20px 8px', textAlign: 'center' },
  heroCheck: {
    margin: '0 auto 6px',
    width: '40px',
    height: '40px',
    lineHeight: '40px',
    fontSize: '20px',
    fontWeight: 700,
    color: t.accent,
    backgroundColor: t.accentTint,
    borderRadius: '50%',
    textAlign: 'center',
  },
  heroKicker: {
    margin: '0 0 4px',
    fontSize: '11px',
    lineHeight: '14px',
    letterSpacing: '0.12em',
    fontWeight: 700,
    color: t.accent,
  },
  heroTitle: {
    margin: '0 0 8px',
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: 700,
    color: t.text,
  },
  heroSub: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '20px',
    color: t.muted,
  },

  // Progress bar — single horizontal line, no columns
  progressWrap: { padding: '14px 20px 0', textAlign: 'center' },
  progressBar: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '20px',
    color: t.light,
  },
  progressStepActive: {
    fontWeight: 700,
    color: t.accent,
  },
  progressDivider: {
    color: t.light,
    fontSize: '12px',
  },
  progressStep: {
    color: t.muted,
    fontWeight: 500,
  },

  // Info rows — vertically stacked, never break
  infoBlock: {
    margin: '16px 20px 0',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: t.panel,
    border: `1px solid ${t.borderSoft}`,
  },
  infoRow: {
    margin: '0 0 4px',
    fontSize: '13px',
    lineHeight: '20px',
    color: t.text,
  },
  infoLabel: {
    color: t.light,
    fontWeight: 600,
    fontSize: '12px',
  },
  infoValue: {
    fontWeight: 700,
    color: t.text,
  },

  // Products block
  productsBlock: {
    margin: '16px 20px 0',
    border: `1px solid ${t.border}`,
    borderRadius: '14px',
    overflow: 'hidden',
  },
  sectionTitle: {
    margin: 0,
    padding: '14px 14px 8px',
    fontSize: '15px',
    lineHeight: '20px',
    fontWeight: 700,
    color: t.text,
  },
  emptyText: {
    margin: 0,
    padding: '12px 14px',
    fontSize: '13px',
    color: t.muted,
  },

  // Product rows — image on its own line, text full-width below
  productRow: {
    padding: '12px 14px',
    borderTop: `1px solid ${t.borderSoft}`,
  },
  productImg: {
    width: '56px',
    height: '56px',
    borderRadius: '10px',
    objectFit: 'cover',
    border: `1px solid ${t.borderSoft}`,
    display: 'block',
    marginBottom: '8px',
  },
  productName: {
    margin: '0 0 2px',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 600,
    color: t.text,
    wordBreak: 'break-word',
  },
  productMeta: {
    margin: '0 0 2px',
    fontSize: '12px',
    lineHeight: '18px',
    color: t.muted,
  },
  productTotal: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 700,
    color: t.text,
  },

  // Pricing
  pricingBox: {
    padding: '12px 14px',
    backgroundColor: t.panel,
    borderTop: `1px solid ${t.border}`,
  },
  pricingRow: {
    margin: '0 0 4px',
    fontSize: '13px',
    lineHeight: '20px',
    color: t.muted,
  },
  pricingVal: {
    float: 'right',
    fontWeight: 600,
    color: t.text,
  },
  pricingHr: {
    borderColor: t.border,
    margin: '8px 0',
  },
  pricingTotalRow: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '22px',
    fontWeight: 700,
    color: t.accent,
  },
  pricingTotalVal: {
    float: 'right',
    color: t.accent,
  },

  // Delivery
  deliveryBlock: {
    margin: '14px 20px 0',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: t.panel,
    border: `1px solid ${t.borderSoft}`,
  },
  deliveryLabel: {
    margin: '0 0 6px',
    fontSize: '10px',
    lineHeight: '14px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: t.light,
  },
  deliveryLine: {
    margin: '0 0 3px',
    fontSize: '13px',
    lineHeight: '20px',
    color: t.textSecondary,
    wordBreak: 'break-word',
  },

  // Next steps
  nextBlock: {
    margin: '14px 20px 0',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: t.panel,
    border: `1px solid ${t.borderSoft}`,
  },
  nextTitle: {
    margin: '0 0 8px',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 700,
    color: t.text,
  },
  nextStep: {
    margin: '0 0 4px',
    fontSize: '13px',
    lineHeight: '20px',
    color: t.muted,
  },
  nextNum: {
    fontWeight: 700,
    color: t.accent,
  },

  // CTA
  ctaWrap: { padding: '18px 20px 8px', textAlign: 'center' },
  ctaBtn: {
    backgroundColor: t.accent,
    color: t.white,
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'block',
    textAlign: 'center',
  },

  // Support
  supportWrap: { padding: '12px 20px 0' },
  supportText: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '18px',
    color: t.muted,
    textAlign: 'center',
  },
  link: { color: t.accent, textDecoration: 'none', fontWeight: 600 },

  // Footer
  footerHr: { borderColor: t.borderSoft, margin: '16px 20px 0' },
  footer: { padding: '16px 20px 24px', textAlign: 'center' },
  footerStore: {
    margin: '0 0 4px',
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 700,
    color: t.text,
  },
  footerLinks: {
    margin: '0 0 6px',
    fontSize: '12px',
    lineHeight: '18px',
    color: t.muted,
  },
  footerDisclaimer: {
    margin: 0,
    fontSize: '11px',
    lineHeight: '16px',
    color: t.light,
  },
};

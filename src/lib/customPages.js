export const DEFAULT_CUSTOM_PAGES = [
  {
    slug: 'about-us',
    title: 'About Us',
    label: 'About Us',
    description: 'Learn more about Ornaments by Arshad and the artistry behind our handcrafted fine jewelry.',
    content: `Ornaments by Arshad is a premier luxury jewelry maison dedicated to the art of fine jewelry crafting, certified diamond creations, and heirloom gold ornaments.

Every creation is an exquisite union of heritage craftsmanship, precious metals, and hand-selected gemstones. From statement bridal sets to understated daily luxury, our pieces are designed to celebrate life's most cherished milestones.

Our promise is rooted in uncompromising purity, authentic certification, and personalized customer care. Discover timeless elegance with Ornaments by Arshad.`,
    seoTitle: 'About Us | Ornaments by Arshad',
    seoDescription: 'Discover the artistry, heritage, and philosophy of fine jewelry at Ornaments by Arshad.',
    isEnabled: true,
    showInFooter: true,
    sortOrder: 0,
  },
  {
    slug: 'refund-policy',
    title: 'Refund & Exchange Policy',
    label: 'Refund Policy',
    description: 'Understand the return, exchange, and certification terms for Ornaments by Arshad.',
    content: `At Ornaments by Arshad, we stand behind the authenticity and craftsmanship of every jewelry piece. Each order is dispatched with certified purity documentation and luxury protective packaging.

In the rare event of transit damage or manufacturing defect, please contact our concierge support within 7 days of delivery with your order ID and certificate number.

Customized, engraved, or bespoke bridal creations are crafted specifically upon commission and may be subject to evaluation prior to exchange.`,
    seoTitle: 'Refund Policy | Ornaments by Arshad',
    seoDescription: 'Read the exchange and warranty terms for Ornaments by Arshad luxury jewelry.',
    isEnabled: true,
    showInFooter: true,
    sortOrder: 1,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    label: 'Privacy Policy',
    description: 'See how client information is collected, safeguarded, and protected at Ornaments by Arshad.',
    content: `We collect essential contact and delivery details exclusively to process your luxury jewelry orders, fulfill custom sizing requirements, and provide secure delivery updates.

Your confidentiality is paramount. Client records and bespoke order inquiries are held in strict privacy and are never shared or sold to third-party marketing services.

All online interactions and checkout transmissions are secured with industry-standard encryption protocols.`,
    seoTitle: 'Privacy Policy | Ornaments by Arshad',
    seoDescription: 'Learn how Ornaments by Arshad safeguards client information and confidentiality.',
    isEnabled: true,
    showInFooter: true,
    sortOrder: 2,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping & Insured Delivery',
    label: 'Shipping Policy',
    description: 'Review our insured nationwide delivery process and secure packaging standards.',
    content: `All jewelry shipments from Ornaments by Arshad are fully insured, tamper-sealed, and delivered via trusted high-value logistics partners across Pakistan.

Each parcel is packed in our signature luxury presentation box with authenticity cards and certificates included.

Tracking information is provided upon dispatch. For high-value custom orders, scheduled hand-delivery or direct collection can be arranged.`,
    seoTitle: 'Shipping Policy | Ornaments by Arshad',
    seoDescription: 'Find insured delivery, packaging, and dispatch information for Ornaments by Arshad.',
    isEnabled: false,
    showInFooter: false,
    sortOrder: 3,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    label: 'FAQ',
    description: 'Find quick answers about jewelry customization, gold purity, diamonds, and care.',
    content: `Q: Are all gold and diamond items certified?
A: Yes, every piece of gold and diamond jewelry comes with a detailed certificate of authenticity verifying purity, weight, and gemstone specifications.

Q: Can I request custom ring sizing or personalized engravings?
A: Absolutely. Our master craftsmen can customize ring sizes, bracelet lengths, and engravings. Reach out to our concierge team for bespoke inquiries.

Q: How is high-value jewelry shipped?
A: All orders are dispatched in discrete, tamper-proof, insured luxury packaging with end-to-end tracking.

Q: How can I care for my fine jewelry?
A: Avoid direct exposure to harsh perfumes and chemicals. We recommend storing each piece in its original velvet box and cleaning gently with a soft microfiber cloth.`,
    seoTitle: 'FAQ | Ornaments by Arshad',
    seoDescription: 'Frequently asked questions about fine jewelry, customization, and care at Ornaments by Arshad.',
    isEnabled: true,
    showInFooter: true,
    sortOrder: 4,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    label: 'Terms of Service',
    description: 'Read the terms and conditions governing fine jewelry purchases at Ornaments by Arshad.',
    content: `Welcome to Ornaments by Arshad. By accessing our boutique website or commissioning jewelry, you agree to the following terms:

1. Jewelry Pricing & Metal Rates: Precious metal and diamond rates are pegged to official bullion standards. All prices are listed in Pakistani Rupees (PKR).
2. Authenticity Guarantee: Every piece is accompanied by genuine purity hallmarks and certification.
3. Bespoke Orders: Custom designs and personalized jewelry require preliminary consultation and approval.
4. Concierge Care: For any inquiry or order assistance, our jewelry specialists are available directly via WhatsApp and email.`,
    seoTitle: 'Terms of Service | Ornaments by Arshad',
    seoDescription: 'Terms and conditions for jewelry purchases at Ornaments by Arshad.',
    isEnabled: true,
    showInFooter: true,
    sortOrder: 5,
  },
];

export function normalizeCustomPageSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCustomPageEntry(page = {}, index = 0) {
  const slug = normalizeCustomPageSlug(page.slug || page.title || `custom-page-${index + 1}`) || `custom-page-${index + 1}`;
  const title = String(page.title || page.label || slug).trim() || slug;

  return {
    slug,
    title,
    label: String(page.label || title).trim() || title,
    description: String(page.description || '').trim(),
    content: String(page.content || '').trim(),
    seoTitle: String(page.seoTitle || '').trim(),
    seoDescription: String(page.seoDescription || '').trim(),
    isEnabled: page.isEnabled !== false,
    showInFooter: page.showInFooter !== false,
    sortOrder: Number(page.sortOrder ?? index) || 0,
  };
}

export function mergeCustomPages(pages = []) {
  const normalizedIncoming = Array.isArray(pages)
    ? pages.map((page, index) => normalizeCustomPageEntry(page, index))
    : [];

  const incomingMap = new Map(normalizedIncoming.map((page) => [page.slug, page]));
  const mergedDefaults = DEFAULT_CUSTOM_PAGES.map((page, index) => ({
    ...page,
    ...(incomingMap.get(page.slug) || {}),
    sortOrder: Number(incomingMap.get(page.slug)?.sortOrder ?? page.sortOrder ?? index) || index,
  }));

  const extraPages = normalizedIncoming.filter(
    (page) => !DEFAULT_CUSTOM_PAGES.some((defaultPage) => defaultPage.slug === page.slug),
  );

  return [...mergedDefaults, ...extraPages]
    .map((page, index) => normalizeCustomPageEntry(page, index))
    .sort((a, b) => {
      const sortDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (sortDiff !== 0) return sortDiff;
      return a.title.localeCompare(b.title);
    });
}

export function getCustomPageBySlug(pages = [], slug = '') {
  let safeSlug = normalizeCustomPageSlug(slug);
  if (!safeSlug) return null;
  if (safeSlug === 'terms') safeSlug = 'terms-of-service';
  if (safeSlug === 'privacy') safeSlug = 'privacy-policy';

  return mergeCustomPages(pages).find((page) => page.slug === safeSlug) || null;
}

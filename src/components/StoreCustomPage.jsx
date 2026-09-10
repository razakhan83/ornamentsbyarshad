import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, CircleHelp, FileText, Lock, Phone, RotateCcw, Store, Truck } from 'lucide-react';
import FaqAccordion from '@/components/FaqAccordion';
import { getStoreSettings } from '@/lib/data';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { formatStorePhone, resolveStorePhone, storePhoneTelHref } from '@/lib/storeContact';

const PAGE_META = {
  'about-us': { Icon: Store, label: 'Our Story' },
  faq: { Icon: CircleHelp, label: 'Help Center' },
  'privacy-policy': { Icon: Lock, label: 'Legal' },
  'refund-policy': { Icon: RotateCcw, label: 'Policy' },
  'shipping-policy': { Icon: Truck, label: 'Shipping' },
};

/* 15 comprehensive Q&As for the standalone /faq page */
const FULL_FAQ = [
  {
    id: 'f1',
    question: 'What kind of jewelry pieces does Ornaments by Arshad offer?',
    answer:
      'We craft and curate high-end fine jewelry: certified diamond solitaire rings, 22K and 18K gold bridal sets, gemstone necklaces, handcrafted bangles, and bespoke custom jewelry creations.',
  },
  {
    id: 'f2',
    question: 'How do I browse and shop on the website?',
    answer:
      'Use the top navigation or search bar to find products by category or keyword. Click any product to see details, images, and pricing. Add to cart and proceed to checkout: the whole process takes under 2 minutes.',
  },
  {
    id: 'f3',
    question: 'Can I search for a specific product?',
    answer:
      'Yes. The search bar at the top of every page lets you search by product name, category, or keyword. Results update in real time as you type.',
  },
  {
    id: 'f4',
    question: 'Do you deliver all over Pakistan?',
    answer:
      'Yes, we ship to all major cities and towns across Pakistan including Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, and beyond. Delivery typically takes 3–6 working days.',
  },
  {
    id: 'f5',
    question: 'How much does delivery cost?',
    answer:
      'Delivery charges depend on your location and order size. Exact charges are shown at checkout before you confirm your order. We also run free shipping promotions on qualifying orders.',
  },
  {
    id: 'f6',
    question: 'What payment methods do you accept?',
    answer:
      'We accept Cash on Delivery (COD) across Pakistan. You pay when the parcel arrives at your door. Bank transfer and online payment are also available at checkout.',
  },
  {
    id: 'f7',
    question: 'Is it safe to order online from your store?',
    answer:
      'Completely safe. Our website uses HTTPS encryption. For COD orders, you don\'t share any card details: just your name, phone, and address. Your information is never sold or shared.',
  },
  {
    id: 'f8',
    question: 'Can I save products to buy later?',
    answer:
      'Yes, use the wishlist button (heart icon) on any product to save it. You can view and manage your wishlist from the account menu. Wishlist syncs across your session.',
  },
  {
    id: 'f9',
    question: 'How do I track my order?',
    answer:
      'Once your order ships, you\'ll receive a tracking number via WhatsApp or SMS. You can use it to track your parcel on the courier\'s website. You can also check order status in your account under "My Orders".',
  },
  {
    id: 'f10',
    question: 'What if I receive a wrong or damaged item?',
    answer:
      'Contact us within 48 hours of delivery via WhatsApp with your order number and a photo of the item. We will either send a replacement or issue a full refund with zero hassle.',
  },
  {
    id: 'f11',
    question: 'Can I cancel or change my order after placing it?',
    answer:
      'Yes, but only before the order is dispatched. Message us on WhatsApp as soon as possible with your order number. Once the parcel has shipped, cancellation is not possible.',
  },
  {
    id: 'f12',
    question: 'Are your products authentic and good quality?',
    answer:
      'Every product listed is sourced from verified suppliers and checked for quality before listing. We have been importing directly from China for years: quality is our top priority.',
  },
  {
    id: 'f13',
    question: 'Do you offer deals or discounts?',
    answer:
      'Yes! Check the Deals section on our website for current promotions. We also run WhatsApp-exclusive flash sales: follow us on WhatsApp or Instagram to stay updated.',
  },
  {
    id: 'f14',
    question: 'Do you offer wholesale or bulk ordering?',
    answer:
      'Yes, we supply retailers, resellers, and wholesalers. Chat with us on WhatsApp with your product requirements and quantities. We offer competitive B2B pricing with flexible payment terms.',
  },
  {
    id: 'f15',
    question: 'How do I contact customer support?',
    answer:
      'The fastest way is WhatsApp or a direct call using the official store number shown at the bottom of this page. We also welcome visits to our Karachi shop during business hours.',
  },
];

function getContentBlocks(content = '') {
  return String(content || '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function getFaqItems(content = '') {
  return String(content || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return null;
      const question = lines[0].replace(/^q\s*:\s*/i, '').trim();
      const answer = lines.slice(1).join(' ').replace(/^a\s*:\s*/i, '').trim();
      if (!question || !answer) return null;
      return { id: `faq-${index + 1}`, question, answer };
    })
    .filter(Boolean);
}

/* ─── Section heading used inside policy articles ─── */
function SectionHeading({ children }) {
  return (
    <h2 className="mb-3 mt-10 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  );
}

export default async function StoreCustomPage({ page, storeName = 'Ornaments by Arshad', whatsappNumber = '' }) {
  const settings = await getStoreSettings().catch(() => null);
  const phone = resolveStorePhone(whatsappNumber || settings?.whatsappNumber);
  const displayPhone = formatStorePhone(phone);
  const telHref = storePhoneTelHref(phone);
  const whatsappUrl = createWhatsAppUrl(phone, `Hello ${storeName}, I have a question.`);
  const meta = PAGE_META[page?.slug] || { Icon: FileText, label: 'Info' };
  const { Icon, label } = meta;

  const blocks = getContentBlocks(page?.content);
  const cmsItems = page?.slug === 'faq' ? getFaqItems(page?.content) : [];
  const isFaqPage = page?.slug === 'faq';
  const faqItems = isFaqPage ? (cmsItems.length > 0 ? cmsItems : FULL_FAQ) : [];

  return (
    <div className="bg-background pb-24 pt-14 md:pt-18">
      <div className="container mx-auto max-w-2xl px-5 sm:px-6">

        {/* ── Header & Hero ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            {/* ── Page badge ── */}
            <div className="mb-4 flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {label}
              </span>
            </div>

            {/* ── Title ── */}
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.4rem]">
              {page?.title || 'Store Page'}
            </h1>

            {page?.description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {page.description}
              </p>
            ) : null}
          </div>

          {page?.slug === 'about-us' && (
            <div className="shrink-0 flex items-center justify-start sm:justify-end">
              <Image
                src="/undraw_plants_md5c.svg"
                alt="About Ornaments by Arshad"
                width={150}
                height={115}
                className="h-auto w-[130px] sm:w-[150px] object-contain opacity-95 select-none"
                priority
              />
            </div>
          )}
        </div>

        {/* ── Thin rule ── */}
        <div className="mt-8 mb-8 h-px bg-border" />

        {/* ── Body ── */}
        {isFaqPage ? (
          /* FAQ page */
          <div>
            <FaqAccordion items={faqItems} />

            <div className="mt-12 border-t border-border pt-8">
              <p className="text-sm text-muted-foreground">
                Still have a question? Call{' '}
                <a href={telHref} className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                  {displayPhone}
                </a>
                {' '}or{' '}
                <a
                  href={whatsappUrl || '#'}
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
                >
                  message us on WhatsApp
                </a>
                {' '}for fast assistance.
              </p>
            </div>
          </div>
        ) : page?.content?.trim() ? (
          /* Policy / About / Custom page */
          <article className="text-[15px] leading-[1.85] text-foreground/80">
            {/<[a-z][\s\S]*>/i.test(page.content) ? (
              <div
                className="custom-page-html-content space-y-4 text-[15px] leading-[1.85] text-foreground/85 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-3.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1.5 [&_a]:text-primary [&_a]:underline [&_a]:font-medium hover:[&_a]:opacity-85 [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_th]:border [&_th]:border-border [&_th]:p-3 [&_th]:bg-muted/40 [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/60 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:my-4 [&_img]:rounded-xl [&_img]:my-5 [&_img]:max-w-full [&_hr]:my-8 [&_hr]:border-border [&_strong]:font-bold [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : (
              blocks.map((block, i) => {
                /* Simple heuristic: short blocks (< 90 chars) that don't end in '.'
                   are likely section headings entered by the admin */
                const looksLikeHeading = block.length < 90 && !block.endsWith('.');
                if (i > 0 && looksLikeHeading) {
                  return <SectionHeading key={i}>{block}</SectionHeading>;
                }
                return (
                  <p key={i} className={i > 0 ? 'mt-5' : ''}>
                    {block}
                  </p>
                );
              })
            )}

            <div className="mt-14 border-t border-border pt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <p>
                    Questions about this page? Call{' '}
                    <a href={telHref} className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                      {displayPhone}
                    </a>
                    .
                  </p>
                  <a
                    href={whatsappUrl || '#'}
                    className="inline-flex items-center gap-1.5 font-semibold text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    <Phone className="size-3.5" />
                    Ask us on WhatsApp
                  </a>
                </div>
                <Link
                  href="/products"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Browse Products
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">
            This page is being prepared. Please check back soon.
          </p>
        )}
      </div>
    </div>
  );
}

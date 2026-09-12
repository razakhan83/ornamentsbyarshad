import Link from 'next/link';
import { BadgeCheck, ChevronRight, MapPin, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';

import ConditionalLayoutElements, { HomeOnlyLayoutElements } from '@/components/ConditionalLayoutElements';
import FacebookIcon from '@/components/icons/FacebookIcon';
import InstagramIcon from '@/components/icons/InstagramIcon';
import Navbar from '@/components/Navbar';
import StoreDeferredChrome from '@/components/StoreDeferredChrome';
import StoreLogo from '@/components/StoreLogo';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { normalizeSocialUrl } from '@/lib/social';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import WebsiteFeedbackButton from '@/components/WebsiteFeedbackButton';
import FooterNewsletter from '@/components/FooterNewsletter';

const TRUST_BADGES = [
  { icon: ShieldCheck, title: 'Hallmarked Purity', sub: '100% Certified 18K & 22K Gold' },
  { icon: Truck, title: 'Insured Delivery', sub: 'Tamper-evident priority courier' },
  { icon: RefreshCcw, title: 'Atelier Exchange', sub: '14-day hassle-free policy' },
  { icon: BadgeCheck, title: 'Conflict-Free Gems', sub: 'Ethically sourced gemstones' },
];

export default function LayoutWrapper({ children, categories, settings }) {
  const whatsappLink = createWhatsAppUrl(settings.whatsappNumber);
  const facebookUrl = normalizeSocialUrl(settings.facebookPageUrl);
  const instagramUrl = normalizeSocialUrl(settings.instagramUrl);
  const socialLinks = [
    { href: facebookUrl, label: 'Facebook', icon: FacebookIcon },
    { href: instagramUrl, label: 'Instagram', icon: InstagramIcon },
    { href: whatsappLink, label: 'WhatsApp', icon: WhatsAppIcon },
  ];
  const quickLinks = Array.isArray(settings.customPages)
    ? settings.customPages.filter((page) => page?.isEnabled !== false && page?.showInFooter !== false)
    : [];
  const hasAnnouncementBar = settings.announcementBarEnabled && 
    (settings.announcementBarText || (Array.isArray(settings.announcementBarMessages) && settings.announcementBarMessages.length > 0));

  return (
    <>
      <div className="flex min-h-screen flex-col bg-[#FAF9F6]">
        <Navbar
          categories={categories}
          storeName={settings.storeName}
          lightLogoUrl={settings.lightLogoUrl}
          darkLogoUrl={settings.darkLogoUrl}
          logoScalePercent={settings.logoScalePercent}
          announcementBarEnabled={settings.announcementBarEnabled}
          announcementBarText={settings.announcementBarText}
          announcementBarMessages={settings.announcementBarMessages}
        />

        <main className="flex-1 min-h-[80vh] overflow-x-clip">{children}</main>

        <ConditionalLayoutElements>
          <footer id="store-footer" className="border-t border-[#E8E5DF] bg-[#F7F3EE] pt-12 pb-6 text-[#121212]">
            <div className="container mx-auto max-w-7xl px-4">

              {/* ── Main Footer Columns ── */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div>
                  <div className="mb-5 w-fit origin-left">
                    <StoreLogo
                      storeName={settings.storeName || "Ornaments by Arshad"}
                      lightLogoUrl={settings.lightLogoUrl}
                      darkLogoUrl={settings.darkLogoUrl}
                      logoScalePercent={(settings.logoScalePercent || 100) * 1.85}
                      variant="light-surface"
                    />
                  </div>
                  <p className="max-w-sm text-xs leading-relaxed text-[#737373]">
                    {settings.storeDescription || 'Ornaments by Arshad crafts timeless luxury jewelry, certified gold heirlooms, and bespoke bridal masterworks.'}
                  </p>
                  <div className="mt-5 flex gap-2">
                    {socialLinks.map(({ href, label, icon: Icon }) => (
                      <a
                        key={label}
                        href={href || undefined}
                        target={href ? '_blank' : undefined}
                        rel={href ? 'noopener noreferrer' : undefined}
                        aria-label={label}
                        aria-disabled={!href}
                        className={`inline-flex size-9 items-center justify-center rounded-none border border-[#E8E5DF] bg-white text-[#121212] transition-colors duration-200 ${
                          href ? 'hover:bg-[#121212] hover:text-white hover:border-[#121212]' : 'cursor-not-allowed opacity-40'
                        }`}
                      >
                        <Icon className={label === 'WhatsApp' ? 'size-4' : 'size-3.5'} />
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#121212]">The Collections</h3>
                  <ul className="flex flex-col gap-2 text-xs uppercase tracking-[0.14em] text-[#737373]">
                    {quickLinks.length > 0 ? (
                      quickLinks.map((item) => (
                        <li key={item.slug}>
                          <Link href={`/${item.slug}`} prefetch={false} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#121212]">
                            <ChevronRight className="size-3 text-[#A67C52]" />
                            {item.label || item.title}
                          </Link>
                        </li>
                      ))
                    ) : (
                      <>
                        <li>
                          <Link href="/products" prefetch={false} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#121212]">
                            <ChevronRight className="size-3 text-[#A67C52]" />
                            All Fine Jewelry
                          </Link>
                        </li>
                        <li>
                          <Link href="/products?category=necklace-sets" prefetch={false} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#121212]">
                            <ChevronRight className="size-3 text-[#A67C52]" />
                            Necklace Sets
                          </Link>
                        </li>
                        <li>
                          <Link href="/products?category=bracelets" prefetch={false} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#121212]">
                            <ChevronRight className="size-3 text-[#A67C52]" />
                            Bracelets
                          </Link>
                        </li>
                        <li>
                          <Link href="/products?category=diamond-rings" prefetch={false} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#121212]">
                            <ChevronRight className="size-3 text-[#A67C52]" />
                            Diamond Rings
                          </Link>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#121212]">
                    Join the Circle
                  </h3>
                  <p className="mb-3 text-xs text-[#737373] leading-relaxed">
                    Subscribe to receive private previews of new creations and bespoke collection announcements.
                  </p>
                  <FooterNewsletter />
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#E8E5DF] pt-5 text-xs text-[#737373] sm:flex-row">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center sm:text-left text-[11.5px]">
                  <p className="uppercase tracking-wider">&copy; {new Date().getFullYear()} Ornaments by Arshad.</p>
                  <span className="hidden sm:inline text-[#E8E5DF]">|</span>
                  <div className="flex items-center gap-3 uppercase tracking-wider text-[10.5px]">
                    <Link href="/terms-of-service" prefetch={false} className="transition-colors hover:text-[#121212]">
                      Terms
                    </Link>
                    <span className="size-1 rounded-full bg-[#E8E5DF]" />
                    <Link href="/privacy-policy" prefetch={false} className="transition-colors hover:text-[#121212]">
                      Privacy
                    </Link>
                    <span className="size-1 rounded-full bg-[#E8E5DF]" />
                    <Link href="/contact-us" prefetch={false} className="transition-colors hover:text-[#121212]">
                      Concierge
                    </Link>
                  </div>
                </div>
                <p className="text-center text-xs uppercase tracking-wider text-[#737373]">
                  Developed by{' '}
                  <a
                    href="https://github.com/razakhan83"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#121212] transition-colors underline-offset-4 hover:underline"
                  >
                    Ahmed Raza
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </ConditionalLayoutElements>
      </div>
      <ConditionalLayoutElements>
        <StoreDeferredChrome whatsappNumber={settings.whatsappNumber} storeName={settings.storeName} hasAnnouncementBar={hasAnnouncementBar} />
      </ConditionalLayoutElements>
    </>
  );
}

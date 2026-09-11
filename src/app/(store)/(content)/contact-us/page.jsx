import { cacheLife, cacheTag } from 'next/cache';
import { getStoreSettings } from '@/lib/data';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { resolveStorePhone } from '@/lib/storeContact';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import InstagramIcon from '@/components/icons/InstagramIcon';
import FacebookIcon from '@/components/icons/FacebookIcon';
import Image from 'next/image';
import Link from 'next/link';

import { pageMetadata } from '@/lib/siteSeo';

export const metadata = pageMetadata({
  title: 'Contact Us',
  description: 'Contact Ornaments by Arshad customer concierge on WhatsApp, phone, or email for bespoke jewelry assistance and inquiries.',
});

function PhoneSvg({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailSvg({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LocationPinSvg({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockSvg({ className = 'size-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ArrowUpRightSvg({ className = 'size-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

function ChevronRightSvg({ className = 'size-3' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default async function ContactUsPage() {
  'use cache';
  cacheLife('foreverish');
  cacheTag('settings');

  const settings = await getStoreSettings();

  const storeName = settings.storeName || 'Ornaments by Arshad';
  const whatsappNumber = resolveStorePhone(settings.whatsappNumber);
  const cleanPhone = whatsappNumber.replace(/[^0-9+]/g, '');
  const whatsappUrl = createWhatsAppUrl(whatsappNumber, `Hello ${storeName}, I would like to inquire about jewelry pieces / custom orders.`);
  const supportEmail = settings.supportEmail || 'support@ornamentsbyarshad.com';
  const businessAddress = settings.businessAddress || 'Luxury Jewelry Galleria, Karachi, Pakistan';

  let instagramUrl = settings.instagramUrl || 'https://instagram.com/ornamentsbyarshad';
  let instagramHandle = '@ornamentsbyarshad';
  if (instagramUrl.includes('instagram.com/')) {
    const handle = instagramUrl.split('instagram.com/')[1]?.replace(/\/$/, '');
    if (handle) instagramHandle = `@${handle}`;
  }

  let facebookUrl = settings.facebookPageUrl || 'https://facebook.com';

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 sm:pt-10 md:pt-14">
      <div className="container mx-auto max-w-4xl lg:max-w-5xl px-4 sm:px-6 md:px-8">
        
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRightSvg className="size-3 md:size-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">Contact Us</span>
        </nav>

        {/* Page Header with SVG Illustration on Right */}
        <div className="mb-8 md:mb-12 border-b border-[#E8E5DF] pb-6">
          <div className="max-w-xl">
            <span className="block text-[11px] font-sans uppercase tracking-[0.24em] text-[#A67C52] font-semibold mb-1">
              Concierge & Client Support
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl tracking-wide font-normal text-[#121212] uppercase">
              We&apos;re Here to Help
            </h1>
            <p className="text-xs sm:text-sm text-[#737373] mt-2 leading-relaxed">
              Have questions regarding our jewelry collections, bespoke orders, or order tracking? Contact our dedicated advisors.
            </p>
          </div>
        </div>

        {/* WhatsApp Featured Row */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-7 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <WhatsAppIcon className="size-6 sm:size-7 text-[#25D366] shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-foreground">WhatsApp Hotline</h2>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground font-mono mt-0.5">
                {whatsappNumber}
              </p>
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto h-10 md:h-11 px-5 md:px-6 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0"
          >
            <WhatsAppIcon className="size-4 md:size-4.5" />
            Chat on WhatsApp
          </a>
        </div>

        {/* Channels Grid (Phone, Email, Instagram, Facebook) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          
          {/* Phone Call */}
          <a
            href={`tel:${cleanPhone}`}
            className="p-5 md:p-6 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <PhoneSvg className="size-5 md:size-6 text-foreground/75 group-hover:text-primary transition-colors shrink-0" />
              <div>
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direct Call</span>
                <span className="text-sm md:text-base font-bold text-foreground font-mono mt-0.5 block">{whatsappNumber}</span>
              </div>
            </div>
            <ArrowUpRightSvg className="size-4 md:size-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          {/* Email */}
          <a
            href={`mailto:${supportEmail}`}
            className="p-5 md:p-6 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <MailSvg className="size-5 md:size-6 text-foreground/75 group-hover:text-primary transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
                <span className="text-sm md:text-base font-bold text-foreground truncate mt-0.5 block">{supportEmail}</span>
              </div>
            </div>
            <ArrowUpRightSvg className="size-4 md:size-4.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </a>

          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 md:p-6 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <InstagramIcon className="size-5 md:size-6 text-foreground/75 group-hover:text-primary transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instagram</span>
                <span className="text-sm md:text-base font-bold text-foreground truncate mt-0.5 block">{instagramHandle}</span>
              </div>
            </div>
            <ArrowUpRightSvg className="size-4 md:size-4.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </a>

          {/* Facebook */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 md:p-6 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <FacebookIcon className="size-5 md:size-6 text-foreground/75 group-hover:text-primary transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Facebook</span>
                <span className="text-sm md:text-base font-bold text-foreground truncate mt-0.5 block">{storeName}</span>
              </div>
            </div>
            <ArrowUpRightSvg className="size-4 md:size-4.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </a>

        </div>

        {/* Store Location & Timings */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <LocationPinSvg className="size-5 md:size-6 text-foreground/75 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Store Location</span>
              <p className="text-sm md:text-base font-medium text-foreground mt-0.5 leading-relaxed">{businessAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 md:border-l md:border-border md:pl-6">
            <ClockSvg className="size-5 md:size-6 text-foreground/75 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Working Hours</span>
              <p className="text-sm md:text-base font-semibold text-foreground mt-0.5">Mon – Sat: 10:00 AM – 9:00 PM</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

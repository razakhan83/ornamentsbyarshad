import { Suspense } from 'react';
import AnimatedStats from '@/components/AnimatedStats';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import TiltedProductMarquee from '@/components/TiltedProductMarquee';
import HomeFaqSection from '@/components/HomeFaqSection';
import { getStoreSettings } from '@/lib/data';
import { createWhatsAppUrl } from '@/lib/whatsapp';

export default async function HomeBelowFold() {
  const settings = await getStoreSettings();
  const whatsappLink = createWhatsAppUrl(settings.whatsappNumber);

  return (
    <>
      <div id="store-animated-stats">
        <AnimatedStats />
      </div>

      <div id="store-marquee-wrapper">
        <Suspense fallback={<div className="h-[700px] w-full bg-background" />}>
          <TiltedProductMarquee />
        </Suspense>
      </div>

      <div id="store-wholesale-cta" className="mt-auto border-t border-border bg-primary/5 px-4 py-14 sm:py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h3 className="mb-3 text-lg font-bold text-primary sm:text-xl">
            Are You a Wholesaler or Retailer?
          </h3>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Wholesale & Bulk Orders
          </h2>
          <p className="mb-8 text-base leading-relaxed text-foreground/85 sm:text-lg">
            Looking to stock premium imported gadgets, kitchenware, and lifestyle products? We supply top-notch quality items at competitive wholesale rates. Connect with us directly for <span className="font-semibold text-primary">bulk orders</span> and <span className="font-semibold text-primary">exclusive B2B pricing</span>.
          </p>
          <a
            href={whatsappLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-[15px] font-semibold text-primary-foreground shadow-none transition-all duration-200 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <WhatsAppIcon className="size-4 sm:size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div id="store-faq-wrapper">
        <HomeFaqSection />
      </div>
    </>
  );
}

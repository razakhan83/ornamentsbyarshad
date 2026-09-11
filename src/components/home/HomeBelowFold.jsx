import { Suspense } from 'react';
import AnimatedStats from '@/components/AnimatedStats';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import TiltedProductMarquee from '@/components/TiltedProductMarquee';
import HomeFaqSection from '@/components/HomeFaqSection';
import PakistaniTestimonialsCarousel from '@/components/PakistaniTestimonialsCarousel';
import { getStoreSettings } from '@/lib/data';
import { createWhatsAppUrl } from '@/lib/whatsapp';

export default async function HomeBelowFold() {
  const settings = await getStoreSettings();
  const whatsappLink = createWhatsAppUrl(settings.whatsappNumber);

  return (
    <>
      {/* Editorial Brand Story Section */}
      <section id="store-brand-story" className="border-t border-b border-[#E8E5DF] bg-[#FAF9F6] py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 xl:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-[4/5] sm:aspect-[3/2] lg:aspect-[4/5] overflow-hidden bg-[#F4F2EE] border border-[#E8E5DF] rounded-xl sm:rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80"
                alt="Master Goldsmith Crafting Fine Jewelry"
                className="w-full h-full object-cover rounded-xl sm:rounded-2xl transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
            </div>

            <div className="space-y-6 lg:max-w-xl">
              <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.26em] text-[#A67C52] font-semibold block">
                Heritage & Excellence
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-wide text-[#121212] leading-[1.2] uppercase">
                The Art of Eternal <br className="hidden sm:inline" />
                <span className="italic font-light">Craftsmanship</span>
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 font-sans leading-relaxed">
                At <strong>Ornaments by Arshad</strong>, every piece is sculpted as a timeless heirloom. Handcrafted by master artisans using ethically sourced gemstones, conflict-free diamonds, and certified hallmarked gold, our creations embody grace, sovereignty, and unmatched refinement.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <a
                  href="/about-us"
                  className="inline-flex items-center justify-center bg-[#121212] text-white px-8 py-4 text-xs font-sans uppercase tracking-[0.2em] font-semibold rounded-none hover:bg-neutral-800 transition-all active:scale-[0.98] text-center"
                >
                  Discover Our Story
                </a>
                <a
                  href={whatsappLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-[#121212] text-[#121212] px-6 py-4 text-xs font-sans uppercase tracking-[0.2em] font-semibold rounded-none hover:bg-[#121212] hover:text-white transition-all active:scale-[0.98] text-center"
                >
                  <WhatsAppIcon className="size-4 shrink-0" />
                  Bespoke Consultation
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auto-scrolling Pakistani Women Testimonials */}
      <div id="store-testimonials-wrapper">
        <PakistaniTestimonialsCarousel />
      </div>

      <div id="store-faq-wrapper">
        <HomeFaqSection />
      </div>

      {/* Why Choose Ornaments by Arshad - positioned right before footer */}
      <div id="store-animated-stats">
        <AnimatedStats />
      </div>
    </>
  );
}

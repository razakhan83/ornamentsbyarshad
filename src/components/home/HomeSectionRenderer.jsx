import HeroSlider from '@/components/HeroSlider';
import HomeCategoriesGrid from '@/components/home/HomeCategoriesGrid';
import HomeProductGridSection from '@/components/home/HomeProductGridSection';
import HomeTestimonialsCarousel from '@/components/HomeTestimonialsCarousel';
import HomeProductBanner from '@/components/home/HomeProductBanner';
import HomeScrollableBannerCarousel from '@/components/home/HomeScrollableBannerCarousel';
import HomeVideoCatalog from '@/components/home/HomeVideoCatalog';

function HomeAnnouncementStrip() {
  const items = [
    'Complimentary Insured Courier Delivery Across Pakistan',
    '100% Certified 18K & 22K Hallmarked Gold Heirlooms',
    'Bespoke Bridal Atelier Commissions & WhatsApp Concierge',
    'Generational Mastery & Handcrafted Perfection',
  ];

  return (
    <div className="w-full py-2.5 bg-transparent border-y border-[#E8E5DF]/70 overflow-hidden select-none">
      <div className="flex overflow-x-hidden whitespace-nowrap">
        <div className="inline-flex animate-marquee-left whitespace-nowrap gap-8 text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.22em] text-[#121212]">
          {items.concat(items).map((text, idx) => (
            <div key={idx} className="inline-flex items-center gap-8 shrink-0">
              <span className="font-semibold text-[#121212]">{text}</span>
              <span className="size-1 rounded-full bg-[#A67C52]" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomeSectionRenderer({ sections = [] }) {
  const safeSections = Array.isArray(sections) ? sections : [];
  if (!safeSections.length) return null;

  const hasHero = safeSections.some((section) => section?.type === 'HeroSlider');
  const firstProductSectionId = safeSections.find(
    (section) => section?.type === 'ProductGridByCategory' || section?.type === 'ProductCollection'
  )?.id;

  return (
    <>
      {safeSections.map((section) => {
        if (!section || !section.type) return null;
        if (section.type === 'HeroSlider') {
          return <HeroSlider key={section.id} slides={section.slides} />;
        }

        if (section.type === 'CategoriesGrid') {
          return (
            <div key={section.id}>
              <HomeCategoriesGrid
                title={section.title}
                categories={section.categories}
              />
              <HomeAnnouncementStrip />
            </div>
          );
        }

        if (section.type === 'CustomerReviews') {
          if (!section.reviews || !section.reviews.length) return null;
          return (
            <HomeTestimonialsCarousel
              key={section.id}
              title={section.title}
              description={section.description}
              reviews={section.reviews}
            />
          );
        }

        if (section.type === 'ProductBanner') {
          return (
            <HomeProductBanner
              key={section.id}
              title={section.title}
              description={section.description}
              desktopImages={section.desktopImages}
              mobileImage={section.mobileImage}
            />
          );
        }

        if (section.type === 'ScrollableBannerCarousel') {
          return (
            <HomeScrollableBannerCarousel
              key={section.id}
              title={section.title}
              description={section.description}
              banners={section.carouselBanners}
            />
          );
        }

        if (section.type === 'ProductGridByCategory' || section.type === 'ProductCollection') {
          const priorityCount = !hasHero && section.id === firstProductSectionId ? 2 : 0;
          return (
            <HomeProductGridSection
              key={section.id}
              title={section.title}
              category={section.category}
              products={section.products}
              viewAllHref={section.viewAllHref}
              priorityCount={priorityCount}
            />
          );
        }

        if (section.type === 'VideoCatalog') {
          return (
            <HomeVideoCatalog
              key={section.id}
              title={section.title}
              pcVideo={section.pcVideo}
              mobileVideo={section.mobileVideo}
            />
          );
        }

        return null;
      })}
    </>
  );
}

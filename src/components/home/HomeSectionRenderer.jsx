import HeroSlider from '@/components/HeroSlider';
import HomeCategoriesGrid from '@/components/home/HomeCategoriesGrid';
import HomeProductGridSection from '@/components/home/HomeProductGridSection';
import HomeTestimonialsCarousel from '@/components/HomeTestimonialsCarousel';
import HomeProductBanner from '@/components/home/HomeProductBanner';
import HomeScrollableBannerCarousel from '@/components/home/HomeScrollableBannerCarousel';
import HomeVideoCatalog from '@/components/home/HomeVideoCatalog';

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
            <HomeCategoriesGrid
              key={section.id}
              title={section.title}
              categories={section.categories}
            />
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

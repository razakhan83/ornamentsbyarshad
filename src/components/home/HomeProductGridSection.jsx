import ProductCard from '@/components/ProductCard';
import CategoryProductSlider from '@/components/CategoryProductSlider';
import SectionDoodleBackground from '@/components/home/SectionDoodleBackground';
import { getCategoryColor } from '@/lib/categoryColors';

export default function HomeProductGridSection({
  title = '',
  category = null,
  products = [],
  viewAllHref = '',
  priorityCount = 0,
}) {
  if (!products.length) return null;

  const sectionLabel = title || category?.label || 'Products';
  
  // Determine if it's category-specific or a general section (like New Arrivals)
  const isGeneral = !category && (
    sectionLabel.toLowerCase().includes('arrival') || 
    sectionLabel.toLowerCase().includes('new') ||
    sectionLabel.toLowerCase().includes('featured') ||
    sectionLabel.toLowerCase().includes('top rated')
  );
  
  const sectionBg = isGeneral ? '#f4f4f5' : (category?.bgColor || getCategoryColor(sectionLabel).hex);

  return (
    <section className="relative bg-transparent py-8 md:py-11 even:bg-card/50">
      <SectionDoodleBackground categoryLabel={sectionLabel} />
      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4">
        <CategoryProductSlider
          categoryLabel={sectionLabel}
          viewAllHref={viewAllHref || (category?.id ? `/products?category=${category.id}` : '')}
        >
          {products.map((product, index) => (
            <ProductCard
              key={`${product.slug || product._id || product.id || 'product'}-${index}`}
              product={product}
              className="h-full shadow-none"
              imageBg={sectionBg}
              priority={index < priorityCount}
            />
          ))}
        </CategoryProductSlider>
      </div>
    </section>
  );
}

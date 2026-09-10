import ProductCard from '@/components/ProductCard';
import CategoryProductSlider from '@/components/CategoryProductSlider';
import { getCategoryColorByIndex } from '@/lib/categoryColors';

export default function HomeCategories({ sections = [] }) {
  if (sections.length === 0) {
    return (
      <div className="bg-muted/30 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <p className="text-center text-muted-foreground">No products available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {sections.map((section, idx) => {
        // Use position index so adjacent sections always have different colors.
        // This is independent of category name matching or Tailwind JIT scanning.
        const palette = getCategoryColorByIndex(idx);
        return (
          <section
            key={section.category.id}
            className="home-lazy-section py-8 md:py-11"
            style={{ backgroundColor: palette.hex }}
          >
            <div className="mx-auto w-full max-w-7xl px-4">
              <CategoryProductSlider
                categoryLabel={section.category.label}
                viewAllHref={`/products?category=${section.category.id}`}
              >
                {section.products.map((product, productIndex) => (
                  <ProductCard
                    key={`${product.slug || product._id || product.id || 'item'}-${productIndex}`}
                    product={product}
                    className="h-full shadow-none"
                    imageBg={palette.hex}
                  />
                ))}
              </CategoryProductSlider>
            </div>
          </section>
        );
      })}
    </div>
  );
}



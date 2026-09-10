import Link from 'next/link';
import Image from 'next/image';
import { getProductsList } from '@/lib/data';
import { optimizeCloudinaryUrl, CLOUDINARY_IMAGE_PRESETS } from '@/lib/cloudinaryImage';
import MarqueeTrack from '@/components/home/MarqueeTrack';

function MarqueeCard({ product }) {
  const primaryImage = product.Images?.[0]?.url;
  // Speed optimization: Use productGalleryThumb (240px width) instead of productCard (380px width)
  const imageSrc = primaryImage ? optimizeCloudinaryUrl(primaryImage, CLOUDINARY_IMAGE_PRESETS.productGalleryThumb) : '';

  return (
    <Link 
      href={`/products/${product.slug || product.id}`}
      prefetch={false}
      className="block relative aspect-[4/5] rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] transition-[transform,box-shadow,border-color,opacity] duration-300 w-[120px] sm:w-[150px] md:w-[180px] shrink-0 group/card flex flex-col"
    >
      {/* Product Image Area */}
      <div className="relative w-full aspect-square bg-white flex items-center justify-center p-2.5 shrink-0 border-b border-border/10">
        {imageSrc ? (
          <Image 
            src={imageSrc} 
            alt={product.Name || ''} 
            fill 
            className="object-contain p-2 transition-transform duration-500 group-hover/card:scale-105" 
            sizes="(max-width: 640px) 25vw, 15vw" 
            loading="lazy"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No Image</div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-center min-w-0 bg-card">
        <p className="font-semibold text-foreground text-[10px] sm:text-xs md:text-sm line-clamp-1 group-hover/card:text-primary transition-colors text-center">
          {product.Name}
        </p>
      </div>
    </Link>
  );
}

function MarqueeRow({ products, direction, className = '' }) {
  const items = [...products, ...products];

  return (
    <MarqueeTrack direction={direction} className={className}>
      {items.map((product, idx) => (
        <MarqueeCard key={`${product.id}-${idx}`} product={product} />
      ))}
    </MarqueeTrack>
  );
}

export default async function TiltedProductMarquee() {
  const data = await getProductsList({ limit: 24, sort: 'newest' });
  const products = data?.items || [];

  if (!products || products.length === 0) return null;

  // Split products into 3 rows
  const row1 = [];
  const row2 = [];
  const row3 = [];
  
  products.forEach((p, i) => {
    if (i % 3 === 0) row1.push(p);
    else if (i % 3 === 1) row2.push(p);
    else row3.push(p);
  });

  return (
    <section 
      className="relative overflow-hidden w-full bg-background border-t border-border/50 py-8 md:py-12"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 600px' }}
    >
      {/* Title / Intro */}
      <div className="container relative z-20 mx-auto px-4 mb-6 text-center max-w-2xl">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-1.5">
          Discover Trending Products
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          Explore our most popular and newly arrived selections with premium quality.
        </p>
      </div>

      {/* Main Container constrained to max-w-7xl (matches main site layout width) */}
      <div className="container mx-auto max-w-7xl px-4 relative">
        {/* Gradient Masks (Left & Right fade inside container) */}
        <div className="absolute inset-y-0 left-4 w-12 md:w-24 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-y-0 right-4 w-12 md:w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
        
        {/* Horizontal rows container */}
        <div className="w-full overflow-hidden py-2">
          <div className="flex flex-col gap-4 md:gap-5 w-full">
            <MarqueeRow products={row1.length > 0 ? row1 : products} direction="right" />
            <MarqueeRow products={row2.length > 0 ? row2 : products} direction="left" />
            <MarqueeRow className="hidden md:block" products={row3.length > 0 ? row3 : products} direction="right" />
          </div>
        </div>
      </div>
    </section>
  );
}

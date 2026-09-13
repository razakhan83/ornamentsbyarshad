import { cache } from 'react';
import { Star } from 'lucide-react';
import { notFound } from 'next/navigation';

import CategoryProductSlider from '@/components/CategoryProductSlider';
import ProductCard from '@/components/ProductCard';
import ProductActions, { ProductSocialActions, ProductWhatsAppOrderButton } from '@/components/ProductActions';
import ProductDescription from '@/components/ProductDescription';
import ProductDetailsTabs from '@/components/ProductDetailsTabs';
import ProductGallery from '@/components/ProductGallery';
import ProductViewTracking from '@/components/ProductViewTracking';
import ProductPageScrollReset from '@/components/ProductPageScrollReset';
import ProductMetaTags from './ProductMetaTags';
import ProductReviews from '@/components/ProductReviews';
import MobileBackButton from '@/components/MobileBackButton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { getProductBySlug, getProductPrerenderParams, getProductReviewSummary, getRelatedProducts, getStoreSettings } from '@/lib/data';
import { getProductCategories } from '@/lib/productCategories';
import { formatRichTextDescriptionHtml, stripHtmlTags } from '@/lib/richText';
import { getSiteUrl } from '@/lib/siteUrl';
import { metadataTitle } from '@/lib/siteSeo';
import { getProductSocialShareImage } from '@/lib/cloudinaryImage';
import { getProductUnitPrice, getVisibleCompareAtPrice as getVisibleCompareAt, isProductOutOfStock } from '@/lib/productCommerce';
import { getProductRating, getProductReviewCount } from '@/lib/productReviewUtils';

const formatPrice = (raw) => `Rs. ${Number(raw || 0).toLocaleString('en-PK')}`;
const getSellingPrice = getProductUnitPrice;
const getVisibleCompareAtPrice = (product) => getVisibleCompareAt(product, getSellingPrice(product));
const siteUrl = getSiteUrl();
const PRODUCT_PRERENDER_LIMIT = 48;
const EMPTY_REVIEW_SUMMARY = {
  averageRating: 0,
  reviewCount: 0,
};

function getProductUrl(product) {
  return `${siteUrl}/products/${product.slug || product._id}`;
}

function getProductDescription(product) {
  return (
    product.seoDescription ||
    stripHtmlTags(product.Description) ||
    `Discover ${product.Name} handcrafted by Ornaments by Arshad - Timeless Luxury & Handcrafted Elegance.`
  );
}

function getProductTitle(product) {
  return metadataTitle(product.seoTitle || product.Name);
}

function getCanonicalUrl(product) {
  const canonicalUrl = product.seoCanonicalUrl?.trim();
  if (canonicalUrl) {
    return canonicalUrl;
  }

  return getProductUrl(product);
}

function getProductKeywords(product, categories) {
  const keywords = (product.seoKeywords || '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  if (keywords.length > 0) {
    return keywords;
  }

  return [product.Name, ...categories.map((category) => category.name).filter(Boolean)];
}

function getShareDescription(product) {
  if (product.seoOgDescription?.trim()) {
    return product.seoOgDescription.trim();
  }
  return getProductDescription(product);
}

function getPrimaryImage(product) {
  const rawUrl = product.seoOgImage?.trim();
  const validOgUrl = rawUrl && !rawUrl.startsWith('data:') && rawUrl.length < 2000 ? rawUrl : '';
  const candidateUrl = validOgUrl || product.Images?.[0]?.url;
  if (!candidateUrl || candidateUrl.startsWith('data:')) {
    return `${siteUrl}/opengraph-image.png`;
  }
  return getProductSocialShareImage(candidateUrl, product.seoOgImageRatio === '1:1' ? '1:1' : '1.91:1');
}

function getProductJsonLd({ product, reviewSummary = null }) {
  const categories = getProductCategories(product);
  const categoryNames = categories.map((category) => category.name).filter(Boolean);
  const keywords = getProductKeywords(product, categories);
  const price = getSellingPrice(product);
  const productTitle = getProductTitle(product);
  const productUrl = getCanonicalUrl(product);
  const primaryCategory = categories[0];

  const productSchema = {
    '@type': 'Product',
    name: productTitle,
    description: getProductDescription(product),
    image: product.Images?.map((image) => image.url).filter(Boolean) || [],
    sku: product.slug || product._id,
    category: categoryNames[0] || undefined,
    keywords: keywords.join(', '),
    brand: {
      '@type': 'Brand',
      name: 'Ornaments by Arshad',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'PKR',
      price,
      availability:
        isProductOutOfStock(product)
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const ratingValue = reviewSummary?.reviewCount > 0
    ? Number(reviewSummary.averageRating.toFixed(1))
    : getProductRating(product);
  const ratingCount = reviewSummary?.reviewCount > 0
    ? reviewSummary.reviewCount
    : getProductReviewCount(product);

  productSchema.aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue,
    reviewCount: ratingCount,
  };

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Products',
      item: `${siteUrl}/products`,
    },
  ];

  if (primaryCategory) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: primaryCategory.name,
      item: `${siteUrl}/products?category=${encodeURIComponent(primaryCategory.slug || primaryCategory.id || primaryCategory.name)}`,
    });
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 4,
      name: productTitle,
      item: productUrl,
    });
  } else {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: productTitle,
      item: productUrl,
    });
  }

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [productSchema, breadcrumbSchema],
  };
}

async function getProductPageData(slug) {
  const product = await getProductBySlug(slug);
  if (!product) return null;

  const settings = await getStoreSettings();

  return {
    product,
    settings,
  };
}

async function getProductReviewSummarySafe(productId) {
  try {
    return await getProductReviewSummary(productId);
  } catch (error) {
    console.error(`[storefront/product] review summary fallback for ${productId}:`, error.message);
    return EMPTY_REVIEW_SUMMARY;
  }
}

async function getRelatedProductsSafe(input) {
  try {
    return await getRelatedProducts(input);
  } catch (error) {
    console.error(
      `[storefront/product] related products fallback for ${input?.excludeSlug || 'unknown-product'}:`,
      error.message,
    );
    return [];
  }
}

const getCachedProductPageData = cache(async (slug) => getProductPageData(slug));
const getCachedProductBySlug = cache(async (slug) => getProductBySlug(slug));

export async function generateStaticParams() {
  return getProductPrerenderParams(PRODUCT_PRERENDER_LIMIT);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getCachedProductBySlug(id);

  if (!product) {
    return {
      title: 'Product not found',
    };
  }

  const reviewSummary = await getProductReviewSummarySafe(product._id);
  const categories = getProductCategories(product);
  const productTitle = getProductTitle(product);
  const socialTitle = metadataTitle(product.seoOgTitle?.trim() || productTitle);
  const productUrl = getCanonicalUrl(product);
  const productImage = getPrimaryImage(product);
  const shareDescription = getShareDescription(product);
  const keywords = getProductKeywords(product, categories);
  const price = getSellingPrice(product);
  const availability = isProductOutOfStock(product) ? 'out of stock' : 'in stock';

  const isSquare = product.seoOgImageRatio === '1:1';
  const ogWidth = isSquare ? 1080 : 1200;
  const ogHeight = isSquare ? 1080 : 630;

  return {
    title: productTitle,
    description: getProductDescription(product),
    keywords,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: socialTitle,
      description: shareDescription,
      type: 'website',
      url: productUrl,
      siteName: 'Ornaments by Arshad',
      images: [
        {
          url: productImage,
          secureUrl: productImage,
          width: ogWidth,
          height: ogHeight,
          type: 'image/jpeg',
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: isSquare ? 'summary' : 'summary_large_image',
      title: socialTitle,
      description: shareDescription,
      images: [productImage],
    },
    other: {
      'product:price:amount': String(price),
      'product:price:currency': 'PKR',
      'product:availability': availability,
      'product:rating:value': String(
        reviewSummary.reviewCount > 0
          ? reviewSummary.averageRating.toFixed(1)
          : getProductRating(product)
      ),
      'product:rating:count': String(
        reviewSummary.reviewCount > 0
          ? reviewSummary.reviewCount
          : getProductReviewCount(product)
      ),
    },
  };
}

export default async function ProductPage({ params }) {
  const { id: slug } = await params;
  const pageData = await getProductPageData(slug);

  if (!pageData?.product) {
    notFound();
  }

  const { product, settings } = pageData;
  const primaryCategory = getProductCategories(product)[0];
  const reviewSummary = await getProductReviewSummarySafe(product._id);
  const jsonLd = getProductJsonLd({ product, reviewSummary });
  const isOutOfStock = product.StockStatus === 'Out of Stock' || product.showOnStore === false;

  return (
    <div className="product-detail-shell min-h-screen bg-[#FAF9F6]">
      <ProductPageScrollReset />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="container mx-auto max-w-7xl px-4 pb-0 pt-3 md:pt-8">
        <div className="flex items-center justify-between md:hidden pb-2">
          <MobileBackButton className="-ml-2 bg-transparent border-transparent shadow-none" />
          <ProductMobileStockTag isOutOfStock={isOutOfStock} />
        </div>
        <div className="hidden md:block pb-3">
          <ProductBreadcrumb product={product} primaryCategory={primaryCategory} />
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+var(--mobile-bottom-nav-offset)+3.5rem)] pt-0 md:pb-16 md:pt-2">
        <ProductHeroSection
          product={product}
          settings={settings}
          reviewSummary={reviewSummary}
          categoryLabel={primaryCategory?.name || 'Fine Jewelry'}
        />

        <ProductTabsWrapper product={product} reviewSummary={reviewSummary} />
      </div>

      <RelatedProductsSection
        primaryCategory={primaryCategory}
        excludeSlug={product.slug}
      />
    </div>
  );
}

function ProductMobileStockTag({ isOutOfStock }) {
  return isOutOfStock ? (
    <div className="rounded-none border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] uppercase tracking-wider font-semibold text-destructive">
      Out of Stock
    </div>
  ) : (
    <div className="flex items-center rounded-none border border-[#A67C52]/30 bg-[#A67C52]/10 px-2.5 py-1 text-[11px] uppercase tracking-wider font-semibold text-[#A67C52]">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#A67C52]"></span>
      In Stock
    </div>
  );
}

function ProductBreadcrumb({ product, primaryCategory }) {
  return (
    <Breadcrumb className="overflow-x-auto text-xs uppercase tracking-[0.18em] text-[#737373]">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="hover:text-[#121212] transition-colors">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/products" className="hover:text-[#121212] transition-colors">Collections</BreadcrumbLink>
        </BreadcrumbItem>
        {primaryCategory ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/products?category=${primaryCategory.id}`} className="hover:text-[#121212] transition-colors">
                {primaryCategory.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : null}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-[#121212] font-medium truncate max-w-[240px]">{product.Name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function ProductHeroSection({ product, settings, reviewSummary, categoryLabel }) {
  const price = getSellingPrice(product);
  const availability = isProductOutOfStock(product) ? 'out of stock' : 'in stock';
  const compareAtPrice = getVisibleCompareAtPrice(product);

  return (
    <>
      <ProductMetaTags
        price={price}
        currency="PKR"
        availability={availability}
      />
      <ProductViewTracking
        enabled={settings.trackingEnabled === true}
        facebookPixelId={settings.facebookPixelId}
        tiktokPixelId={settings.tiktokPixelId}
        productId={product.slug || product._id}
        name={product.Name}
        category={categoryLabel || 'Fine Jewelry'}
        value={price}
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-12">
        <div className="w-full md:w-[48%] lg:w-[46%]">
          <ProductGallery images={product.Images} primaryTag={product.primaryTag} product={product} />
        </div>

        <div className="w-full md:w-[52%] lg:w-[54%]">
          <div className="flex flex-col gap-2.5 sm:gap-3 md:sticky md:top-[120px] md:gap-3.5">
            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-[10px] sm:text-[11px] font-sans font-semibold uppercase tracking-[0.2em] text-[#A67C52] block">
                {categoryLabel || 'Fine Jewelry Haute Joaillerie'}
              </span>

              <div className="flex items-start justify-between gap-3">
                <h1 className="font-serif text-lg sm:text-xl md:text-2xl lg:text-[26px] font-normal leading-[1.3] tracking-normal sm:tracking-wide text-[#121212]">
                  {product.Name}
                </h1>
                <ProductSocialActions product={product} className="mt-0.5 shrink-0 md:hidden" />
              </div>

              {(() => {
                const rating = reviewSummary.reviewCount > 0
                  ? reviewSummary.averageRating
                  : getProductRating(product);
                const count = reviewSummary.reviewCount > 0
                  ? reviewSummary.reviewCount
                  : getProductReviewCount(product);
                return (
                <a 
                  href="#product-reviews"
                  className="group flex w-fit items-center gap-2 pt-0.5"
                >
                   <div className="flex items-center text-[#A67C52]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-3.5 ${i < Math.round(rating || 0) ? 'fill-current' : 'text-neutral-300'}`} />
                      ))}
                   </div>
                   <span className="text-xs font-sans tracking-wide text-[#737373] transition-colors group-hover:text-[#121212]">
                     ({count} {count === 1 ? 'review' : 'reviews'})
                   </span>
                </a>
                );
              })()}
            </div>

            <div className="pt-0.5">
              <ProductActions 
                product={product} 
                whatsappNumber={settings.whatsappNumber} 
                storeName={settings.storeName} 
                basePrice={price}
                compareAtPrice={compareAtPrice}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ProductTabsWrapper({ product, reviewSummary }) {
  const descriptionHtml =
    formatRichTextDescriptionHtml(product.Description) ||
    'Crafted with utmost precision and artistic dedication, this exquisite piece from Ornaments by Arshad showcases timeless elegance, masterfully finished in authentic precious metals.';

  const hasSpecs = Boolean(
    product.metalType ||
    product.purity ||
    product.plating ||
    product.grossWeightGrams ||
    product.size ||
    product.availableSizes?.length ||
    product.availableColors?.length ||
    product.certificateNumber ||
    product.gemstone?.gemstoneType ||
    product.gemstone?.carat
  );

  const gemstoneText = [
    product.gemstone?.gemstoneType,
    product.gemstone?.carat ? `${product.gemstone.carat} ct` : null,
    product.gemstone?.cut ? `Cut: ${product.gemstone.cut}` : null,
    product.gemstone?.clarity ? `Clarity: ${product.gemstone.clarity}` : null,
    product.gemstone?.color ? `Color: ${product.gemstone.color}` : null,
  ].filter(Boolean).join(' • ');

  const specsContent = hasSpecs ? (
    <div className="overflow-hidden rounded-xl border border-[#E8E5DF] bg-[#FAF9F6]">
      <dl className="divide-y divide-[#E8E5DF] text-xs sm:text-sm">
        {product.metalType && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Metal Type</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">{product.metalType}</dd>
          </div>
        )}
        {product.purity && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Gold Purity / Karat</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">{product.purity}</dd>
          </div>
        )}
        {product.plating && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Plating / Polish</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">
              {String(product.plating)
                .replace(/Gold Plating/gi, 'Gold Plated')
                .replace(/Silver Plating/gi, 'Silver Plated')
                .replace(/Rose Gold Plating/gi, 'Rose Gold Plated')
                .replace(/Rhodium Plating/gi, 'Rhodium Plated')
                .trim()}
            </dd>
          </div>
        )}
        {product.grossWeightGrams != null && product.grossWeightGrams !== '' && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Gross Weight</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">{product.grossWeightGrams} Grams</dd>
          </div>
        )}
        {(product.size || (product.availableSizes?.length > 0)) && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Available Sizes</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">
              {product.availableSizes?.length > 0 ? product.availableSizes.join(', ') : product.size}
            </dd>
          </div>
        )}
        {product.availableColors?.length > 0 && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Available Colors</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">
              {product.availableColors.join(', ')}
            </dd>
          </div>
        )}
        {gemstoneText && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Gemstones & Diamonds</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">{gemstoneText}</dd>
          </div>
        )}
        {product.certificateNumber && (
          <div className="grid grid-cols-3 p-3">
            <dt className="text-[#737373] font-medium">Certificate / Hallmark</dt>
            <dd className="col-span-2 text-[#121212] font-semibold">{product.certificateNumber}</dd>
          </div>
        )}
      </dl>
    </div>
  ) : null;

  return (
    <div id="product-reviews" className="scroll-mt-24 md:scroll-mt-32 mt-12 md:mt-20">
      <ProductDetailsTabs
        reviewCount={reviewSummary.reviewCount}
        descriptionContent={<ProductDescription html={descriptionHtml} />}
        specsContent={specsContent}
        reviewsContent={<ProductReviews productId={product._id} productName={product.Name} />}
      />
    </div>
  );
}

async function RelatedProductsSection({ primaryCategory, excludeSlug }) {
  const categorySlug = primaryCategory?.id || '';
  const relatedProducts = await getRelatedProductsSafe({
    category: categorySlug,
    excludeSlug,
    limit: 8,
  });

  if (!relatedProducts || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-primary/5 py-8 md:py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <CategoryProductSlider
          categoryLabel="You May Also Like"
          kicker="More to Explore"
          viewAllHref={primaryCategory ? `/products?category=${primaryCategory.id}` : '/products'}
        >
          {relatedProducts.map((product, index) => (
            <ProductCard
              key={`${product.slug || product._id || product.id || 'item'}-${index}`}
              product={product}
              className="h-full shadow-none"
            />
          ))}
        </CategoryProductSlider>
      </div>
    </div>
  );
}

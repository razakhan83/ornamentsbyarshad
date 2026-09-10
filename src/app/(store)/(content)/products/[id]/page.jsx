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

const formatPrice = (raw) => `Rs. ${Number(raw || 0).toLocaleString('en-PK')}`;
const getSellingPrice = (product) =>
  Number(product.discountedPrice ?? product.Price ?? 0);
const getVisibleCompareAtPrice = (product) => {
  const compareAtPrice = Number(product.compareAtPrice ?? 0);
  const sellingPrice = getSellingPrice(product);

  return compareAtPrice > sellingPrice ? compareAtPrice : null;
};
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
    `Buy ${product.Name} from China Unique Store.`
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
  const rawUrl = product.seoOgImage?.trim() || product.Images?.[0]?.url;
  if (!rawUrl) return `${siteUrl}/opengraph-image.png`;
  return getProductSocialShareImage(rawUrl, product.seoOgImageRatio === '1:1' ? '1:1' : '1.91:1');
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
      name: 'China Unique Store',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'PKR',
      price,
      availability:
        product.StockStatus === 'In Stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  if (reviewSummary?.reviewCount > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(reviewSummary.averageRating.toFixed(1)),
      reviewCount: reviewSummary.reviewCount,
    };
  }

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
  const price = Number(product.discountedPrice ?? product.Price ?? 0);
  const availability = product.StockStatus === 'In Stock' ? 'in stock' : 'out of stock';

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
      siteName: 'China Unique Store',
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
      ...(reviewSummary.reviewCount > 0
        ? {
            'product:rating:value': reviewSummary.averageRating.toFixed(1),
            'product:rating:count': String(reviewSummary.reviewCount),
          }
        : {}),
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
    <div className="product-detail-shell min-h-screen bg-gray-50">
      <ProductPageScrollReset />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="container mx-auto max-w-7xl px-4 pb-0 pt-1 md:pt-7">
        <div className="flex items-center justify-between md:hidden">
          <MobileBackButton className="-ml-2 bg-transparent border-transparent shadow-none" />
          <ProductMobileStockTag isOutOfStock={isOutOfStock} />
        </div>
        <div className="hidden md:block pb-1">
          <ProductBreadcrumb product={product} primaryCategory={primaryCategory} />
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+var(--mobile-bottom-nav-offset)+3.5rem)] pt-0 md:pb-8 md:pt-4">
        <ProductHeroSection
          product={product}
          settings={settings}
          reviewSummary={reviewSummary}
          categoryLabel={primaryCategory?.name || ''}
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
    <div className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
      Out of Stock
    </div>
  ) : (
    <div className="flex items-center rounded-md border border-emerald-500/20 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-600">
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
      In Stock
    </div>
  );
}

function ProductBreadcrumb({ product, primaryCategory }) {
  return (
    <Breadcrumb className="overflow-x-auto">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/products">Products</BreadcrumbLink>
        </BreadcrumbItem>
        {primaryCategory ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/products?category=${primaryCategory.id}`}>
                {primaryCategory.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        ) : null}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{product.Name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function ProductHeroSection({ product, settings, reviewSummary, categoryLabel }) {
  const price = getSellingPrice(product);
  const availability = product.StockStatus === 'In Stock' ? 'in stock' : 'out of stock';
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
        category={categoryLabel || 'Product'}
        value={price}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8 lg:gap-10">
        <div className="w-full md:w-[45%] lg:w-[42%]">
          <ProductGallery images={product.Images} primaryTag={product.primaryTag} product={product} />
        </div>

        <div className="w-full md:w-[55%] lg:w-[58%]">
          <div className="flex flex-col gap-4 md:sticky md:top-[164px] md:gap-6">
            <div className="space-y-2 md:space-y-4">
              <div className="mt-2 flex items-start justify-between gap-4">
                <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-2xl sm:leading-tight md:text-4xl md:leading-tight">
                  {product.Name}
                </h1>
                <ProductSocialActions product={product} className="mt-0.5 shrink-0 md:hidden" />
              </div>

              {reviewSummary.reviewCount > 0 && (
                <a 
                  href="#product-reviews"
                  className="group -mt-1 flex w-fit items-center gap-2"
                >
                   <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-4 ${i < Math.round(reviewSummary.averageRating || 0) ? 'fill-current' : 'text-muted-foreground/30'}`} />
                      ))}
                   </div>
                   <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                     ({reviewSummary.reviewCount} {reviewSummary.reviewCount === 1 ? 'review' : 'reviews'})
                   </span>
                </a>
              )}
            </div>

            <div className="pt-2">
              <ProductActions 
                product={product} 
                whatsappNumber={settings.whatsappNumber} 
                storeName={settings.storeName} 
                basePrice={price}
                compareAtPrice={compareAtPrice}
              />
            </div>

            {product.shortDescription ? (
              <div
                className="mt-6 border-t border-border pt-6 text-base leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: product.shortDescription }}
              />
            ) : <Separator className="my-6" />}

            <div className="mt-4">
              <ProductWhatsAppOrderButton 
                product={product} 
                whatsappNumber={settings.whatsappNumber} 
                storeName={settings.storeName} 
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
    'Discover the perfect addition to your collection. This premium item from China Unique Store is crafted with quality and elegance in mind.';

  return (
    <div id="product-reviews" className="scroll-mt-24 md:scroll-mt-32">
      <ProductDetailsTabs
        reviewCount={reviewSummary.reviewCount}
        descriptionContent={<ProductDescription html={descriptionHtml} />}
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

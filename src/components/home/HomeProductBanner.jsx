import Image from 'next/image';
import Link from 'next/link';

import { CLOUDINARY_IMAGE_PRESETS, optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import SectionDoodleBackground from '@/components/home/SectionDoodleBackground';

function BannerFrame({ item, className = '', sizes }) {
  if (!item?.image?.url) return null;

  const content = (
    <div className={`relative overflow-hidden rounded-[1.75rem] ${className}`}>
      <Image
        src={optimizeCloudinaryUrl(item.image.url, CLOUDINARY_IMAGE_PRESETS.storeBanner)}
        alt={item.alt || 'Store banner'}
        fill
        sizes={sizes}
        loading="lazy"
        className="object-cover transition-transform duration-500 hover:scale-[1.02]"
        {...getBlurPlaceholderProps(item.image.blurDataURL)}
      />
    </div>
  );

  return item.link ? (
    <Link href={item.link} prefetch={false} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function HomeProductBanner({
  title = '',
  description = '',
  desktopImages = [],
  mobileImage,
}) {
  if (desktopImages.length < 2 || !mobileImage?.image?.url) return null;

  return (
    <section className="relative bg-white py-8 md:py-10">
      <SectionDoodleBackground categoryLabel={title} />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        {(title || description) ? (
          <div className="mb-4 max-w-2xl">
            {title ? (
              <h2 className="text-[1.7rem] font-bold tracking-[-0.05em] text-primary [text-wrap:balance] md:text-[2.15rem]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground md:text-base [text-wrap:pretty]">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="hidden grid-cols-2 gap-4 lg:grid">
          {desktopImages.slice(0, 2).map((item, index) => (
            <BannerFrame
              key={`desktop-banner-${index}`}
              item={item}
              className="aspect-[16/5] shadow-[0_18px_42px_rgba(10,61,46,0.09)]"
              sizes="(min-width: 1024px) 50vw, 50vw"
            />
          ))}
        </div>

        <div className="lg:hidden">
          <BannerFrame
            item={mobileImage}
            className="aspect-[16/8] shadow-[0_18px_42px_rgba(10,61,46,0.09)]"
            sizes="(max-width: 1023px) 100vw, 100vw"
          />
        </div>
      </div>
    </section>
  );
}

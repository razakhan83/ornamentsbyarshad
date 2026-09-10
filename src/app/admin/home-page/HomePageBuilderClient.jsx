'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  Images,
  LayoutGrid,
  Loader2,
  Monitor,
  Plus,
  Save,
  Star,
  Smartphone,
  SquareStack,
  Tag,
  Trash2,
  Upload,
  Clock,
  ChevronRight,
  Video,
  Flame,
  Trophy,
  Sparkles,
  MessageSquareQuote,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { uploadImageDataUrl, uploadVideoFile } from '@/lib/cloudinaryUpload';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { cn } from '@/lib/utils';
import CategoryShowcaseDialog from '../categories/CategoryShowcaseDialog';

const SECTION_TEMPLATES = [
  {
    type: 'HeroSlider',
    label: 'Hero Slider',
    icon: Images,
  },
  {
    type: 'CustomerReviews',
    label: 'Customer Reviews (Testimonials)',
    icon: MessageSquareQuote,
  },
  {
    type: 'ProductCollection',
    collectionKey: 'featured',
    label: 'Featured Products (Ads)',
    icon: Sparkles,
  },
  {
    type: 'ProductCollection',
    collectionKey: 'new-arrivals',
    label: 'New Arrival Products',
    icon: Clock,
  },
  {
    type: 'ProductCollection',
    collectionKey: 'best-sellers',
    label: 'Best Seller / Hot Products',
    icon: Flame,
  },
  {
    type: 'ProductCollection',
    collectionKey: 'special-offers',
    label: 'Special Offer Products',
    icon: Tag,
  },
  {
    type: 'ProductCollection',
    collectionKey: 'top-rated',
    label: 'Top Rated Products',
    icon: Star,
  },
  {
    type: 'CategoriesGrid',
    label: 'All Categories',
    icon: LayoutGrid,
  },
  {
    type: 'ProductBanner',
    label: 'Product Banner',
    icon: Monitor,
  },
  {
    type: 'ScrollableBannerCarousel',
    label: 'Scrollable Banner Carousel',
    icon: Images,
  },
  {
    type: 'ProductGridByCategory',
    label: 'Category Products',
    icon: SquareStack,
  },
  {
    type: 'VideoCatalog',
    label: 'Video Catalog',
    icon: Video,
  },
];

function cleanText(value = '') {
  return String(value || '').trim();
}

function createSectionId(type, index, useTimestamp = false) {
  const prefix = String(type || 'section').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  if (useTimestamp) {
    return `${prefix}-${Date.now()}-${index}`;
  }
  return `${prefix}-${index + 1}`;
}

function createHeroSlide(index = 0) {
  return {
    id: `hero-slide-${Date.now()}-${index}`,
    alt: '',
    link: '',
    desktopImage: null,
    mobileImage: null,
  };
}

function createCarouselBanner(index = 0) {
  return {
    id: `carousel-banner-${Date.now()}-${index}`,
    image: null,
    link: '',
    alt: '',
  };
}

function createSection(template, index = 0) {
  const type = template?.type || 'CategoriesGrid';

  if (type === 'HeroSlider') {
    return {
      id: createSectionId(type, index),
      type,
      title: 'Hero Slider',
      description: '',
      isEnabled: true,
      slides: [createHeroSlide(0)],
    };
  }

  if (type === 'CategoriesGrid') {
    return {
      id: createSectionId(type, index),
      type,
      title: 'Shop by Category',
      description: '',
      isEnabled: true,
    };
  }

  if (type === 'ProductBanner') {
    return {
      id: createSectionId(type, index),
      type,
      title: '',
      description: '',
      isEnabled: true,
      desktopImages: [
        { image: null, link: '', alt: '' },
        { image: null, link: '', alt: '' },
      ],
      mobileImage: { image: null, link: '', alt: '' },
    };
  }

  if (type === 'ScrollableBannerCarousel') {
    return {
      id: createSectionId(type, index),
      type,
      title: 'Featured Banners',
      description: '',
      isEnabled: true,
      carouselBanners: [createCarouselBanner(0)],
    };
  }

  if (type === 'VideoCatalog') {
    return {
      id: createSectionId(type, index),
      type,
      title: 'Video Catalog',
      description: '',
      isEnabled: true,
      pcVideo: null,
      mobileVideo: null,
    };
  }

  if (type === 'CustomerReviews') {
    return {
      id: createSectionId(type, index),
      type,
      title: 'What Customers Say',
      description: 'Real reviews from verified shoppers',
      reviewLimit: 10,
      isEnabled: true,
    };
  }

  return {
    id: createSectionId(type, index),
    type,
    title: template?.label || '',
    description: '',
    collectionKey: template?.collectionKey || '',
    categoryId: '',
    productLimit: 8,
    reviewLimit: 10,
    isEnabled: true,
  };
}

function normalizeSections(input = []) {
  if (!Array.isArray(input)) return [];

  return input.map((section, index) => ({
    ...section,
    id: cleanText(section.id) || createSectionId(section.type, index),
    title: section.title || '',
    description: section.description || '',
    reviewLimit: Math.min(10, Math.max(1, Number(section.reviewLimit || 10))),
    desktopImages: Array.isArray(section.desktopImages)
      ? [section.desktopImages[0], section.desktopImages[1]].map((item) => ({
          image: item?.image || null,
          link: item?.link || '',
          alt: item?.alt || '',
        }))
      : [
          { image: null, link: '', alt: '' },
          { image: null, link: '', alt: '' },
        ],
    mobileImage: {
      image: section.mobileImage?.image || null,
      link: section.mobileImage?.link || '',
      alt: section.mobileImage?.alt || '',
    },
    carouselBanners: Array.isArray(section.carouselBanners)
      ? section.carouselBanners.map((item, bannerIndex) => ({
          id: item?.id || `carousel-banner-${index}-${bannerIndex}`,
          image: item?.image || null,
          link: item?.link || '',
          alt: item?.alt || '',
        }))
      : [],
    collectionKey: section.collectionKey || (section.type === 'ProductCollection' ? 'new-arrivals' : ''),
    categoryId: section.categoryId || '',
    productLimit: Number(section.productLimit || 8),
    isEnabled: section.isEnabled !== false,
    slides: Array.isArray(section.slides)
      ? section.slides.map((slide, slideIndex) => ({
          ...slide,
          id: slide.id || `hero-slide-${index}-${slideIndex}`,
          alt: slide.alt || '',
          link: slide.link || '',
          desktopImage: slide.desktopImage || null,
          mobileImage: slide.mobileImage || null,
        }))
      : [],
    pcVideo: section.pcVideo || null,
    mobileVideo: section.mobileVideo || null,
  }));
}

function PreviewUploadTile({ label, description, asset, onChange, disabled, ratio = 'landscape' }) {
  return (
    <div className="rounded-xl border border-border bg-background/75 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Upload className="size-3.5" />
          Upload
          <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={onChange} />
        </label>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-border bg-muted/25',
          ratio === 'mobileLandscape' ? 'aspect-[16/9]' : 'aspect-[16/8]',
        )}
      >
        {asset?.url ? (
          <Image
            src={asset.url}
            alt={label}
            fill
            sizes={ratio === 'mobileLandscape' ? '(max-width: 1024px) 100vw, 100vw' : '(max-width: 1024px) 100vw, 50vw'}
            className="object-cover"
            {...getBlurPlaceholderProps(asset.blurDataURL)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Upload an image for this slot.
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewVideoUploadTile({ label, description, asset, onChange, disabled, ratio = 'landscape' }) {
  return (
    <div className="rounded-xl border border-border bg-background/75 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Upload className="size-3.5" />
          Upload Video
          <input type="file" accept="video/mp4,video/webm" className="hidden" disabled={disabled} onChange={onChange} />
        </label>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-border bg-muted/25 flex items-center justify-center',
          ratio === 'square' ? 'aspect-square' : 'aspect-[21/9]',
        )}
      >
        {asset?.url ? (
          <video
            src={asset.url}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Upload a video for this slot.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableSectionCard({
  section,
  index,
  categories,
  uploadingKey,
  isExpanded,
  onToggleExpand,
  isDragPreview = false,
  onDelete,
  onToggleEnabled,
  onSectionChange,
  onSectionImageUpload,
  onSectionVideoUpload,
  onAddHeroSlide,
  onHeroSlideChange,
  onHeroSlideImageUpload,
  onRemoveHeroSlide,
  onMoveHeroSlide,
  onAddCarouselBanner,
  onCarouselBannerChange,
  onRemoveCarouselBanner,
  onMoveCarouselBanner,
  onOpenCategoryShowcase,
}) {
  const template = SECTION_TEMPLATES.find(
    (item) => item.type === section.type && (!item.collectionKey || item.collectionKey === section.collectionKey),
  ) || SECTION_TEMPLATES.find((item) => item.type === section.type);
  const Icon = template?.icon || SquareStack;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const sectionLabel = section.title || template?.label || section.type;

  return (
    <section
      ref={setNodeRef}
      style={isDragPreview ? undefined : { transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'surface-card overflow-hidden rounded-2xl border border-border/70 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-300',
        (isDragging || isDragPreview) && 'border-border bg-muted/60 shadow-[0_20px_44px_rgba(0,0,0,0.12)]',
        isDragging && !isDragPreview && 'opacity-60',
        isExpanded && 'ring-1 ring-border shadow-[0_12px_28px_rgba(0,0,0,0.08)]',
      )}
    >
      <div className={cn(
        "flex h-14 items-center justify-between gap-3 px-3",
        isExpanded && "border-b border-border/50 bg-muted/20"
      )}>
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <button
            type="button"
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-all duration-200',
              (isDragging || isDragPreview)
                ? 'border-border bg-foreground text-background shadow-sm'
                : 'border-border hover:bg-muted hover:text-foreground',
            )}
            aria-label={`Reorder ${template?.label || section.type}`}
            style={{ touchAction: 'none', cursor: isDragPreview ? 'grabbing' : 'grab' }}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
            <Icon className="size-3.5" />
          </div>
          
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="truncate text-xs font-semibold text-foreground">
              {sectionLabel}
            </h3>
            {!section.isEnabled && (
              <Badge variant="outline" className="h-5 shrink-0 rounded-full bg-muted/50 px-2 py-0 text-[9px] uppercase tracking-wider text-muted-foreground">
                Hidden
              </Badge>
            )}
            <Badge variant="secondary" className="h-5 shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium text-muted-foreground/70">
              {index + 1}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="mr-2 flex items-center gap-1.5 border-r border-border/50 pr-2">
            <Switch 
              className="scale-75"
              checked={section.isEnabled !== false} 
              onCheckedChange={() => onToggleEnabled(section.id)} 
            />
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              "size-8 rounded-lg transition-transform duration-200",
              isExpanded && "rotate-90 bg-muted text-foreground"
            )}
            onClick={() => onToggleExpand(section.id)}
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(section.id)}
            aria-label={`Delete ${template?.label || section.type}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="p-4 pt-2">
            <FieldGroup>
        {(section.type === 'CategoriesGrid' || section.type === 'ProductGridByCategory' || section.type === 'ProductBanner' || section.type === 'ScrollableBannerCarousel' || section.type === 'ProductCollection') && (
          <Field>
            <FieldLabel>Section Title</FieldLabel>
            <Input
              value={section.title || ''}
              onChange={(event) => onSectionChange(section.id, { title: event.target.value })}
              placeholder="Optional heading shown on the storefront"
            />
          </Field>
        )}

        {section.type === 'ProductBanner' && (
          <>
            <Field>
              <FieldLabel>Supporting Copy</FieldLabel>
              <Textarea
                value={section.description || ''}
                onChange={(event) => onSectionChange(section.id, { description: event.target.value })}
                placeholder="Optional short supporting copy"
                rows={3}
              />
            </Field>

            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <div className="mb-3">
                <p className="text-sm font-semibold text-foreground">Product Banner Group</p>
                <p className="text-xs text-muted-foreground">
                  Two low-profile desktop banners sit side-by-side on large screens. Smaller screens use one dedicated mobile landscape banner.
                </p>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                {[0, 1].map((imageIndex) => (
                  <div key={`desktop-banner-${imageIndex}`} className="rounded-2xl border border-border bg-background/80 p-3">
                    <PreviewUploadTile
                      label={`PC Image ${imageIndex + 1}`}
                      description="Landscape image used in the desktop 2-column row."
                      asset={section.desktopImages?.[imageIndex]?.image}
                      disabled={uploadingKey === `${section.id}:desktopImages:${imageIndex}`}
                      onChange={(event) => onSectionImageUpload(section.id, 'desktopImages', event, imageIndex)}
                    />
                    <div className="mt-3 grid gap-3">
                      <Field>
                        <FieldLabel>Target Link</FieldLabel>
                        <Input
                          value={section.desktopImages?.[imageIndex]?.link || ''}
                          onChange={(event) => onSectionChange(section.id, {
                            desktopImages: (section.desktopImages || []).map((item, idx) =>
                              idx === imageIndex ? { ...item, link: event.target.value } : item
                            ),
                          })}
                          placeholder="/products/example"
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Alt Text</FieldLabel>
                        <Input
                          value={section.desktopImages?.[imageIndex]?.alt || ''}
                          onChange={(event) => onSectionChange(section.id, {
                            desktopImages: (section.desktopImages || []).map((item, idx) =>
                              idx === imageIndex ? { ...item, alt: event.target.value } : item
                            ),
                          })}
                          placeholder={`Describe PC image ${imageIndex + 1}`}
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-border bg-background/80 p-3">
                  <PreviewUploadTile
                    label="Mobile Image"
                    description="Single landscape image for small and medium screens."
                    asset={section.mobileImage?.image}
                    ratio="mobileLandscape"
                    disabled={uploadingKey === `${section.id}:mobileImage`}
                    onChange={(event) => onSectionImageUpload(section.id, 'mobileImage', event)}
                  />
                  <div className="mt-3 grid gap-3">
                    <Field>
                      <FieldLabel>Target Link</FieldLabel>
                      <Input
                        value={section.mobileImage?.link || ''}
                        onChange={(event) => onSectionChange(section.id, {
                          mobileImage: {
                            ...(section.mobileImage || {}),
                            link: event.target.value,
                          },
                        })}
                        placeholder="/products/example"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Alt Text</FieldLabel>
                      <Input
                        value={section.mobileImage?.alt || ''}
                        onChange={(event) => onSectionChange(section.id, {
                          mobileImage: {
                            ...(section.mobileImage || {}),
                            alt: event.target.value,
                          },
                        })}
                        placeholder="Describe the mobile banner"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section.type === 'ScrollableBannerCarousel' && (
          <>
            <Field>
              <FieldLabel>Supporting Copy</FieldLabel>
              <Textarea
                value={section.description || ''}
                onChange={(event) => onSectionChange(section.id, { description: event.target.value })}
                placeholder="Optional short supporting copy"
                rows={3}
              />
            </Field>

            <div className="rounded-2xl border border-border bg-muted/20 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Landscape Banners</p>
                  <p className="text-xs text-muted-foreground">
                    Add multiple landscape banners. They render as a horizontal scroll row on the storefront.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onAddCarouselBanner(section.id)}>
                  <Plus data-icon="inline-start" />
                  Add Banner
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {(section.carouselBanners || []).map((banner, bannerIndex) => (
                  <div key={banner.id || `carousel-banner-${bannerIndex}`} className="rounded-2xl border border-border bg-background/80 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Banner {bannerIndex + 1}</Badge>
                        <span className="text-xs text-muted-foreground">Landscape carousel item</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => onMoveCarouselBanner(section.id, banner.id, -1)}
                          disabled={bannerIndex === 0}
                          aria-label={`Move banner ${bannerIndex + 1} up`}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => onMoveCarouselBanner(section.id, banner.id, 1)}
                          disabled={bannerIndex === (section.carouselBanners?.length || 1) - 1}
                          aria-label={`Move banner ${bannerIndex + 1} down`}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => onRemoveCarouselBanner(section.id, banner.id)}
                          disabled={(section.carouselBanners?.length || 0) <= 1}
                          aria-label={`Remove banner ${bannerIndex + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <PreviewUploadTile
                      label="Landscape Banner"
                      description="Wide banner image for the horizontal carousel."
                      asset={banner.image}
                      disabled={uploadingKey === `${section.id}:carouselBanners:${bannerIndex}`}
                      onChange={(event) => onSectionImageUpload(section.id, 'carouselBanners', event, bannerIndex)}
                    />

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field>
                        <FieldLabel>Target Link</FieldLabel>
                        <Input
                          value={banner.link || ''}
                          onChange={(event) => onCarouselBannerChange(section.id, banner.id, { link: event.target.value })}
                          placeholder="/products/example"
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Alt Text</FieldLabel>
                        <Input
                          value={banner.alt || ''}
                          onChange={(event) => onCarouselBannerChange(section.id, banner.id, { alt: event.target.value })}
                          placeholder="Describe this banner"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {section.type === 'ProductGridByCategory' && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={section.categoryId || ''}
                onValueChange={(value) => {
                  const cat = categories.find((c) => c._id === value);
                  onSectionChange(section.id, {
                    categoryId: value,
                    productLimit: cat?.storefrontProductLimit || section.productLimit || 8,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Product Limit</FieldLabel>
              <Input
                type="number"
                min="1"
                max="24"
                value={section.productLimit || 8}
                onChange={(event) => onSectionChange(section.id, { productLimit: Number(event.target.value || 8) })}
              />
              <FieldDescription>Number of items displayed on storefront for this category (1–24).</FieldDescription>
            </Field>

            {section.categoryId && (
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="text-xs text-foreground">
                  <span className="font-semibold text-primary">Curated Showcase: </span>
                  <span className="text-muted-foreground">
                    Customize front products and pinning order for this category.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const cat = categories.find((c) => c._id === section.categoryId);
                    onOpenCategoryShowcase?.(cat || { _id: section.categoryId, name: section.title || 'Category' });
                  }}
                  className="text-xs font-semibold gap-1.5 h-8 rounded-lg border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Sparkles className="size-3.5" />
                  Customize Front Products & Order
                </Button>
              </div>
            )}
          </div>
        )}

        {section.type === 'ProductCollection' && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel>Collection Type</FieldLabel>
              <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm font-semibold text-foreground">
                {template?.label || section.collectionKey || 'Product Collection'}
              </div>
              <FieldDescription>
                This block is managed from Home Page Settings and no longer depends on category ordering.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Product Limit</FieldLabel>
              <Input
                type="number"
                min="1"
                max="24"
                value={section.productLimit || 8}
                onChange={(event) => onSectionChange(section.id, { productLimit: Number(event.target.value || 8) })}
              />
              <FieldDescription>How many products to show in this homepage block.</FieldDescription>
            </Field>
          </div>
        )}

        {section.type === 'CategoriesGrid' && (
          <Field>
            <FieldDescription>
              This section automatically renders every active category. There is no per-item setup here, so the storefront stays hydration-light.
            </FieldDescription>
          </Field>
        )}

        {section.type === 'VideoCatalog' && (
          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="mb-3">
              <p className="text-sm font-semibold text-foreground">Video Catalog</p>
              <p className="text-xs text-muted-foreground">
                Upload separate videos for PC and Mobile. They will be auto-optimized to lightweight format.
              </p>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/80 p-3">
                <PreviewVideoUploadTile
                  label="PC Video"
                  description="Ultra-wide video for desktop screens (21:9)."
                  asset={section.pcVideo}
                  ratio="cinema"
                  disabled={uploadingKey === `${section.id}:pcVideo`}
                  onChange={(event) => onSectionVideoUpload(section.id, 'pcVideo', event)}
                />
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-3">
                <PreviewVideoUploadTile
                  label="Mobile Video"
                  description="Square video for small screens (1:1)."
                  asset={section.mobileVideo}
                  ratio="square"
                  disabled={uploadingKey === `${section.id}:mobileVideo`}
                  onChange={(event) => onSectionVideoUpload(section.id, 'mobileVideo', event)}
                />
              </div>
            </div>
          </div>
        )}

        {section.type === 'CustomerReviews' && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel>Section Heading</FieldLabel>
                <Input
                  value={section.title || ''}
                  onChange={(event) => onSectionChange(section.id, { title: event.target.value })}
                  placeholder="What Customers Say"
                />
              </Field>
              <Field>
                <FieldLabel>Max Reviews to Display (1 - 10)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={section.reviewLimit || 10}
                  onChange={(event) =>
                    onSectionChange(section.id, {
                      reviewLimit: Math.min(10, Math.max(1, Number(event.target.value) || 10)),
                    })
                  }
                  placeholder="10"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Supporting Subtitle</FieldLabel>
              <Input
                value={section.description || ''}
                onChange={(event) => onSectionChange(section.id, { description: event.target.value })}
                placeholder="Real feedback from verified shoppers"
              />
            </Field>

            <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/85">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Sparkles className="size-4" />
                <span>Curated Customer Reviews</span>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                To manage which reviews appear in this showcase, visit{' '}
                <Link href="/admin/reviews" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                  Admin &gt; Reviews
                </Link>{' '}
                and toggle <strong>&quot;Show on Home&quot;</strong> for up to 10 reviews. If no reviews are featured or this section is switched off, it automatically hides from the storefront.
              </p>
            </div>
          </div>
        )}

        {section.type === 'HeroSlider' && (
          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Slides</p>
                <p className="text-xs text-muted-foreground">Upload desktop and mobile artwork for each hero frame.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onAddHeroSlide(section.id)}>
                <Plus data-icon="inline-start" />
                Add Slide
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {section.slides?.map((slide, slideIndex) => (
                <div key={slide.id} className="rounded-2xl border border-border bg-background/80 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Slide {slideIndex + 1}</Badge>
                      <span className="text-xs text-muted-foreground">Hero image pair</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-xl"
                        onClick={() => onMoveHeroSlide(section.id, slide.id, -1)}
                        disabled={slideIndex === 0}
                        aria-label={`Move slide ${slideIndex + 1} up`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-xl"
                        onClick={() => onMoveHeroSlide(section.id, slide.id, 1)}
                        disabled={slideIndex === (section.slides?.length || 1) - 1}
                        aria-label={`Move slide ${slideIndex + 1} down`}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-xl"
                        onClick={() => onRemoveHeroSlide(section.id, slide.id)}
                        disabled={(section.slides?.length || 0) <= 1}
                        aria-label={`Remove slide ${slideIndex + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <PreviewUploadTile
                      label="Desktop Slide"
                      description="Large landscape image for desktop and wide screens."
                      asset={slide.desktopImage}
                      disabled={uploadingKey === `${section.id}:${slide.id}:desktopImage`}
                      onChange={(event) => onHeroSlideImageUpload(section.id, slide.id, 'desktopImage', event)}
                    />
                    <PreviewUploadTile
                      label="Mobile Slide"
                      description="Portrait or narrow image for phones."
                      asset={slide.mobileImage}
                      mobile
                      disabled={uploadingKey === `${section.id}:${slide.id}:mobileImage`}
                      onChange={(event) => onHeroSlideImageUpload(section.id, slide.id, 'mobileImage', event)}
                    />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field>
                      <FieldLabel>Alt Text</FieldLabel>
                      <Input
                        value={slide.alt || ''}
                        onChange={(event) => onHeroSlideChange(section.id, slide.id, { alt: event.target.value })}
                        placeholder="Describe the hero frame"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Optional Link</FieldLabel>
                      <Input
                        value={slide.link || ''}
                        onChange={(event) => onHeroSlideChange(section.id, slide.id, { link: event.target.value })}
                        placeholder="/products/example"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </FieldGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

function SaveHomePageButton({ saving, saved, uploadingKey, onSave, className }) {
  return (
    <Button
      onClick={onSave}
      disabled={saving || Boolean(uploadingKey)}
      size="sm"
      className={cn('admin-cta-button', className)}
    >
      {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
      {saving ? 'Saving...' : saved ? 'Saved' : 'Save Home Page'}
    </Button>
  );
}

function AddSectionDropdown({ isTemplateAlreadyUsed, onAddSection }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="admin-cta-button">
          <Plus data-icon="inline-start" />
          Add Section
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Choose a home page block</DropdownMenuLabel>
          {SECTION_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isUsed = isTemplateAlreadyUsed(template);

            return (
              <DropdownMenuItem
                key={`${template.type}-${template.collectionKey || 'base'}`}
                disabled={isUsed}
                onClick={() => {
                  if (!isUsed) onAddSection(template);
                }}
                className="min-h-10"
              >
                <Icon />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{template.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {template.type === 'ProductCollection'
                      ? 'Curated product row'
                      : template.type.replace(/([a-z])([A-Z])/g, '$1 $2')}
                  </span>
                </span>
                {isUsed ? (
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                    Added
                  </Badge>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HomePageSettingsHeader({
  saving,
  saved,
  uploadingKey,
  onSave,
  isTemplateAlreadyUsed,
  onAddSection,
}) {
  const statusLabel = saving
    ? 'Saving'
    : uploadingKey
      ? 'Uploading asset'
      : saved
        ? 'Saved'
        : 'Ready';

  return (
    <div className="sticky top-0 z-50 -mx-3 mb-3 border-b border-border/80 bg-background/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:mx-0 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Home Page Settings
          </h1>
          <Badge variant={saved ? 'default' : 'secondary'} className="rounded-full px-2 py-0 text-[10px]">
            {statusLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <AddSectionDropdown
            isTemplateAlreadyUsed={isTemplateAlreadyUsed}
            onAddSection={onAddSection}
          />
          <SaveHomePageButton
            saving={saving}
            saved={saved}
            uploadingKey={uploadingKey}
            onSave={onSave}
            className="h-7 sm:min-w-[9rem]"
          />
        </div>
      </div>
    </div>
  );
}

function HomePageSectionsWorkspace({
  sections,
  sectionIds,
  activeSection,
  expandedIds,
  onToggleExpand,
  sensors,
  availableCategories,
  uploadingKey,
  onAddSection,
  onDragStart,
  onDragEnd,
  onDragCancel,
  onDeleteSection,
  onToggleEnabled,
  onSectionChange,
  onSectionImageUpload,
  onSectionVideoUpload,
  onAddHeroSlide,
  onHeroSlideChange,
  onHeroSlideImageUpload,
  onRemoveHeroSlide,
  onMoveHeroSlide,
  onAddCarouselBanner,
  onCarouselBannerChange,
  onRemoveCarouselBanner,
  onMoveCarouselBanner,
  onOpenCategoryShowcase,
}) {
  if (sections.length === 0) {
    return (
      <Empty className="surface-card rounded-2xl border border-border/70 px-6 py-10 shadow-sm">
        <EmptyHeader className="items-center text-center">
          <EmptyMedia variant="icon" className="bg-muted/50">
            <LayoutGrid className="size-8 text-muted-foreground/50" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">No sections added yet</EmptyTitle>
          <EmptyDescription className="max-w-[280px]">
            Build your homepage by dragging templates from the menu above.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex justify-center">
          <Button type="button" variant="default" size="sm" className="rounded-xl" onClick={() => onAddSection(SECTION_TEMPLATES[0])}>
            <Plus className="size-4" />
            Add Hero Slider
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <DndContext
      id="home-page-builder-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 sm:pr-2">
          <div className="flex flex-col gap-2">
            {sections.map((section, index) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                index={index}
                categories={availableCategories}
                uploadingKey={uploadingKey}
                isExpanded={expandedIds.has(section.id)}
                onToggleExpand={onToggleExpand}
                onDelete={onDeleteSection}
                onToggleEnabled={onToggleEnabled}
                onSectionChange={onSectionChange}
                onSectionImageUpload={onSectionImageUpload}
                onSectionVideoUpload={onSectionVideoUpload}
                onAddHeroSlide={onAddHeroSlide}
                onHeroSlideChange={onHeroSlideChange}
                onHeroSlideImageUpload={onHeroSlideImageUpload}
                onRemoveHeroSlide={onRemoveHeroSlide}
                onMoveHeroSlide={onMoveHeroSlide}
                onAddCarouselBanner={onAddCarouselBanner}
                onCarouselBannerChange={onCarouselBannerChange}
                onRemoveCarouselBanner={onRemoveCarouselBanner}
                onMoveCarouselBanner={onMoveCarouselBanner}
                onOpenCategoryShowcase={onOpenCategoryShowcase}
              />
            ))}
          </div>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeSection ? (
          <div className="w-[min(100%,72rem)] px-1">
            <SortableSectionCard
              section={activeSection}
              index={sections.findIndex((section) => section.id === activeSection.id)}
              categories={availableCategories}
              uploadingKey={uploadingKey}
              isDragPreview
              isExpanded={false}
              onToggleExpand={() => {}}
              onDelete={() => {}}
              onToggleEnabled={() => {}}
              onSectionChange={() => {}}
              onSectionImageUpload={() => {}}
              onSectionVideoUpload={() => {}}
              onAddHeroSlide={() => {}}
              onHeroSlideChange={() => {}}
              onHeroSlideImageUpload={() => {}}
              onRemoveHeroSlide={() => {}}
              onMoveHeroSlide={() => {}}
              onAddCarouselBanner={() => {}}
              onCarouselBannerChange={() => {}}
              onRemoveCarouselBanner={() => {}}
              onMoveCarouselBanner={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default function HomePageBuilderClient({ initialSections, availableCategories }) {
  const [sections, setSections] = useState(() => normalizeSections(initialSections));
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('');
  const [showcaseModal, setShowcaseModal] = useState({ open: false, category: null });

  const toggleSection = (sectionId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) || null,
    [activeSectionId, sections],
  );
  const uniqueCollectionKeys = useMemo(
    () =>
      new Set(
        sections
          .filter((section) => section.type === 'ProductCollection')
          .map((section) => section.collectionKey)
          .filter(Boolean),
      ),
    [sections],
  );

  function isTemplateAlreadyUsed(template) {
    if (template.type !== 'ProductCollection') return false;
    return uniqueCollectionKeys.has(template.collectionKey);
  }

  function updateSection(sectionId, patch) {
    setSaved(false);
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)),
    );
  }

  function updateHeroSlides(sectionId, updater) {
    setSaved(false);
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          slides: updater(Array.isArray(section.slides) ? section.slides : []),
        };
      }),
    );
  }

  function updateCarouselBanners(sectionId, updater) {
    setSaved(false);
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          carouselBanners: updater(Array.isArray(section.carouselBanners) ? section.carouselBanners : []),
        };
      }),
    );
  }

  function handleAddSection(template) {
    if (isTemplateAlreadyUsed(template)) {
      toast.error(`${template.label} can only be added once.`);
      return;
    }

    setSaved(false);
    setSections((current) => [...current, createSection(template, current.length)]);
  }

  // Helper to create a new section with a timestamp-based ID to avoid collisions for new items
  function createSection(template, index = 0) {
    const type = template?.type || 'CategoriesGrid';
    const base = {
      id: createSectionId(type, index, true),
      type,
      title: template?.label || '',
      description: '',
      isEnabled: true,
    };

    if (type === 'HeroSlider') {
      return { ...base, title: 'Hero Slider', slides: [createHeroSlide(0)] };
    }
    if (type === 'ScrollableBannerCarousel') {
      return { ...base, title: 'Featured Banners', carouselBanners: [createCarouselBanner(0)] };
    }
    if (type === 'ProductBanner') {
      return {
        ...base,
        desktopImages: [{ image: null, link: '', alt: '' }, { image: null, link: '', alt: '' }],
        mobileImage: { image: null, link: '', alt: '' }
      };
    }
    
    return {
      ...base,
      collectionKey: template?.collectionKey || '',
      categoryId: '',
      productLimit: 8,
    };
  }

  function handleDeleteSection(sectionId) {
    setSaved(false);
    setSections((current) =>
      current
        .filter((section) => section.id !== sectionId)
        .map((section, index) => ({ ...section, order: index })),
    );
  }

  function handleToggleEnabled(sectionId) {
    setSaved(false);
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, isEnabled: section.isEnabled === false } : section,
      ),
    );
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveSectionId('');
    if (!over || active.id === over.id) return;

    setSaved(false);
    setSections((current) => {
      const oldIndex = current.findIndex((section) => section.id === active.id);
      const newIndex = current.findIndex((section) => section.id === over.id);
      return arrayMove(current, oldIndex, newIndex).map((section, index) => ({ ...section, order: index }));
    });
  }

  function handleDragStart(event) {
    setActiveSectionId(String(event.active?.id || ''));
  }

  function handleDragCancel() {
    setActiveSectionId('');
  }

  function handleAddHeroSlide(sectionId) {
    updateHeroSlides(sectionId, (slides) => [...slides, createHeroSlide(slides.length)]);
  }

  function handleHeroSlideChange(sectionId, slideId, patch) {
    updateHeroSlides(sectionId, (slides) =>
      slides.map((slide) => (slide.id === slideId ? { ...slide, ...patch } : slide)),
    );
  }

  function handleRemoveHeroSlide(sectionId, slideId) {
    updateHeroSlides(sectionId, (slides) => {
      const nextSlides = slides.filter((slide) => slide.id !== slideId);
      return nextSlides.length > 0 ? nextSlides : [createHeroSlide(0)];
    });
  }

  function handleMoveHeroSlide(sectionId, slideId, direction) {
    updateHeroSlides(sectionId, (slides) => {
      const currentIndex = slides.findIndex((slide) => slide.id === slideId);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= slides.length) return slides;
      return arrayMove(slides, currentIndex, nextIndex);
    });
  }

  function handleAddCarouselBanner(sectionId) {
    updateCarouselBanners(sectionId, (banners) => [...banners, createCarouselBanner(banners.length)]);
  }

  function handleCarouselBannerChange(sectionId, bannerId, patch) {
    updateCarouselBanners(sectionId, (banners) =>
      banners.map((banner) => (banner.id === bannerId ? { ...banner, ...patch } : banner)),
    );
  }

  function handleRemoveCarouselBanner(sectionId, bannerId) {
    updateCarouselBanners(sectionId, (banners) => {
      const nextBanners = banners.filter((banner) => banner.id !== bannerId);
      return nextBanners.length > 0 ? nextBanners : [createCarouselBanner(0)];
    });
  }

  function handleMoveCarouselBanner(sectionId, bannerId, direction) {
    updateCarouselBanners(sectionId, (banners) => {
      const currentIndex = banners.findIndex((banner) => banner.id === bannerId);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= banners.length) return banners;
      return arrayMove(banners, currentIndex, nextIndex);
    });
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result || '');
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function uploadFromInput(file) {
    const dataUrl = await readFileAsDataUrl(file);
    return uploadImageDataUrl(dataUrl, 'kifayatly_homepage');
  }

  async function handleSectionImageUpload(sectionId, fieldName, event, imageIndex = null) {
    const file = Array.from(event.target.files || []).find((entry) => entry.type.startsWith('image/'));
    event.target.value = '';
    if (!file) return;

    const uploadId = imageIndex == null ? `${sectionId}:${fieldName}` : `${sectionId}:${fieldName}:${imageIndex}`;
    setUploadingKey(uploadId);
    setSaved(false);

    try {
      const asset = await uploadFromInput(file);
      if (fieldName === 'desktopImages') {
        setSections((current) =>
          current.map((section) => {
            if (section.id !== sectionId) return section;

            return {
              ...section,
              desktopImages: (section.desktopImages || []).map((item, idx) =>
                idx === imageIndex ? { ...item, image: asset } : item,
              ),
            };
          }),
        );
      } else if (fieldName === 'carouselBanners') {
        setSections((current) =>
          current.map((section) => {
            if (section.id !== sectionId) return section;

            return {
              ...section,
              carouselBanners: (section.carouselBanners || []).map((item, idx) =>
                idx === imageIndex ? { ...item, image: asset } : item,
              ),
            };
          }),
        );
      } else if (fieldName === 'mobileImage') {
        setSections((current) =>
          current.map((section) => (
            section.id === sectionId
              ? {
                  ...section,
                  mobileImage: {
                    ...(section.mobileImage || {}),
                    image: asset,
                  },
                }
              : section
          )),
        );
      } else {
        updateSection(sectionId, { [fieldName]: asset });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upload image.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleSectionVideoUpload(sectionId, fieldName, event) {
    const file = Array.from(event.target.files || []).find((entry) => entry.type.startsWith('video/'));
    event.target.value = '';
    if (!file) return;

    const uploadId = `${sectionId}:${fieldName}`;
    setUploadingKey(uploadId);
    setSaved(false);

    try {
      const ratioType = fieldName === 'pcVideo' ? 'pc' : fieldName === 'mobileVideo' ? 'mobile' : null;
      const asset = await uploadVideoFile(file, 'kifayatly_homepage_videos', ratioType);
      updateSection(sectionId, { [fieldName]: asset });
    } catch (error) {
      toast.error(error.message || 'Failed to upload video.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleHeroSlideImageUpload(sectionId, slideId, fieldName, event) {
    const file = Array.from(event.target.files || []).find((entry) => entry.type.startsWith('image/'));
    event.target.value = '';
    if (!file) return;

    const uploadId = `${sectionId}:${slideId}:${fieldName}`;
    setUploadingKey(uploadId);
    setSaved(false);

    try {
      const asset = await uploadFromInput(file);
      handleHeroSlideChange(sectionId, slideId, { [fieldName]: asset });
    } catch (error) {
      toast.error(error.message || 'Failed to upload slide image.');
    } finally {
      setUploadingKey('');
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/home-page', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: sections.map((section, index) => ({
            ...section,
            order: index,
            collectionKey: section.collectionKey || '',
            desktopImages: Array.isArray(section.desktopImages)
              ? section.desktopImages.map((item) => ({
                  image: item?.image || null,
                  link: item?.link || '',
                  alt: item?.alt || '',
                }))
              : [],
            carouselBanners: Array.isArray(section.carouselBanners)
              ? section.carouselBanners.map((item) => ({
                  image: item?.image || null,
                  link: item?.link || '',
                  alt: item?.alt || '',
                }))
              : [],
            mobileImage: section.mobileImage
              ? {
                  image: section.mobileImage.image || null,
                  link: section.mobileImage.link || '',
                  alt: section.mobileImage.alt || '',
                }
              : null,
            slides: Array.isArray(section.slides)
              ? section.slides.map((slide) => ({
                  ...slide,
                  desktopImage: slide.desktopImage || null,
                  mobileImage: slide.mobileImage || null,
                }))
              : [],
            pcVideo: section.pcVideo || null,
            mobileVideo: section.mobileVideo || null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save home page layout.');
      }

      setSections(normalizeSections(data.data?.sections || []));
      setSaved(true);
      toast.success('Home page layout updated.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error(error.message || 'Failed to save home page layout.');
    } finally {
      setSaving(false);
    }
  }

  return (
      <div className="w-full pb-8 md:pb-0">
      <HomePageSettingsHeader
        saving={saving}
        saved={saved}
        uploadingKey={uploadingKey}
        onSave={handleSave}
        isTemplateAlreadyUsed={isTemplateAlreadyUsed}
        onAddSection={handleAddSection}
      />

      <div className="mt-3">
        <HomePageSectionsWorkspace
          sections={sections}
          sectionIds={sectionIds}
          activeSection={activeSection}
          expandedIds={expandedIds}
          onToggleExpand={toggleSection}
          sensors={sensors}
          availableCategories={availableCategories}
          uploadingKey={uploadingKey}
          onAddSection={handleAddSection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          onDeleteSection={handleDeleteSection}
          onToggleEnabled={handleToggleEnabled}
          onSectionChange={updateSection}
          onSectionImageUpload={handleSectionImageUpload}
          onSectionVideoUpload={handleSectionVideoUpload}
          onAddHeroSlide={handleAddHeroSlide}
          onHeroSlideChange={handleHeroSlideChange}
          onHeroSlideImageUpload={handleHeroSlideImageUpload}
          onRemoveHeroSlide={handleRemoveHeroSlide}
          onMoveHeroSlide={handleMoveHeroSlide}
          onAddCarouselBanner={handleAddCarouselBanner}
          onCarouselBannerChange={handleCarouselBannerChange}
          onRemoveCarouselBanner={handleRemoveCarouselBanner}
          onMoveCarouselBanner={handleMoveCarouselBanner}
          onOpenCategoryShowcase={(cat) => setShowcaseModal({ open: true, category: cat })}
        />
      </div>

      <CategoryShowcaseDialog
        category={showcaseModal.category}
        isOpen={showcaseModal.open}
        onClose={() => setShowcaseModal({ open: false, category: null })}
        onSaved={(updatedCategory) => {
          toast.success(`Showcase settings updated for ${updatedCategory.name}`);
        }}
      />
    </div>
  );
}

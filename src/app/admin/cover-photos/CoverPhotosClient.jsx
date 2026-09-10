'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Images, Loader2, Monitor, Plus, Save, Smartphone, Tablet, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImageDataUrl } from '@/lib/cloudinaryUpload';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { cn } from '@/lib/utils';

function createSlideId(item, index) {
  return (
    item?.id ||
    item?.desktopImage?.publicId ||
    item?.tabletImage?.publicId ||
    item?.mobileImage?.publicId ||
    item?.desktopImage?.url ||
    `cover-${index}`
  );
}

function normalizeAsset(asset, fallback = null) {
  const source = asset && typeof asset === 'object' ? asset : {};
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {};
  const url = String(source.url || fallbackSource.url || '').trim();
  if (!url) return null;

  return {
    url,
    publicId: String(source.publicId || fallbackSource.publicId || '').trim(),
    blurDataURL: String(source.blurDataURL || fallbackSource.blurDataURL || '').trim(),
  };
}

function normalizeSlides(input = []) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const desktopImage = normalizeAsset(item?.desktopImage || item, item);
      if (!desktopImage) return null;

      return {
        id: createSlideId(item, index),
        desktopImage,
        tabletImage: normalizeAsset(item?.tabletImage),
        mobileImage: normalizeAsset(item?.mobileImage),
        alt: String(item?.alt || '').trim(),
        sortOrder: Number(item?.sortOrder ?? index) || 0,
      };
    })
    .filter(Boolean);
}

function createEmptySlide(index) {
  return {
    id: `cover-${Date.now()}-${index}`,
    desktopImage: null,
    tabletImage: null,
    mobileImage: null,
    alt: '',
    sortOrder: index,
  };
}

function VariantUpload({ slideId, variantKey, title, description, icon: Icon, asset, fallbackAsset, onUpload, disabled }) {
  const previewAsset = asset || fallbackAsset || null;
  const helperText =
    variantKey === 'desktopImage'
      ? description
      : asset
        ? description
        : `${description} Falls back to the large image until uploaded.`;

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{helperText}</p>
          </div>
        </div>
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <Upload className="size-3.5" />
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(event) => onUpload(slideId, variantKey, event)}
          />
        </label>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted/25">
        {previewAsset ? (
          <Image
            src={previewAsset.url}
            alt={`${title} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            {...getBlurPlaceholderProps(previewAsset.blurDataURL)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Upload an image for this breakpoint.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableSlideCard({ slide, index, onRemove, onAltChange, onUpload, uploadingSlideId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
                'group relative overflow-hidden rounded-2xl border border-border bg-background shadow-[0_16px_40px_rgba(0,0,0,0.08)]',
                isDragging && 'z-10 shadow-[0_24px_60px_rgba(0,0,0,0.18)]',
      )}
    >
      <div className="border-b border-border bg-muted/25 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Cover {index + 1}
            </p>
            <p className="text-sm font-semibold text-foreground">Homepage hero slide</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={`Reorder cover image ${index + 1}`}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(slide.id)}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <Label className="mb-1.5">Alt Text</Label>
          <Input
            value={slide.alt}
            onChange={(event) => onAltChange(slide.id, event.target.value)}
            placeholder={`Store cover ${index + 1}`}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <VariantUpload
            slideId={slide.id}
            variantKey="desktopImage"
            title="Large Screen"
            description="Used on large desktop layouts."
            icon={Monitor}
            asset={slide.desktopImage}
            fallbackAsset={slide.desktopImage}
            onUpload={onUpload}
            disabled={uploadingSlideId === slide.id}
          />
          <VariantUpload
            slideId={slide.id}
            variantKey="tabletImage"
            title="Medium Screen"
            description="Used on tablet and medium layouts."
            icon={Tablet}
            asset={slide.tabletImage}
            fallbackAsset={slide.desktopImage}
            onUpload={onUpload}
            disabled={uploadingSlideId === slide.id}
          />
          <VariantUpload
            slideId={slide.id}
            variantKey="mobileImage"
            title="Mobile Screen"
            description="Used on small mobile layouts."
            icon={Smartphone}
            asset={slide.mobileImage}
            fallbackAsset={slide.desktopImage}
            onUpload={onUpload}
            disabled={uploadingSlideId === slide.id}
          />
        </div>
      </div>
    </div>
  );
}

export default function CoverPhotosClient({ initialSlides }) {
  const [slides, setSlides] = useState(normalizeSlides(initialSlides));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const slideIds = useMemo(() => slides.map((slide) => slide.id), [slides]);

  function handleAddSlide() {
    setSaved(false);
    setSlides((current) => [...current, createEmptySlide(current.length)]);
  }

  function handleRemoveSlide(id) {
    setSlides((current) =>
      current
        .filter((slide) => slide.id !== id)
        .map((slide, index) => ({ ...slide, sortOrder: index })),
    );
    setSaved(false);
  }

  function handleAltChange(id, value) {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, alt: value } : slide)),
    );
    setSaved(false);
  }

  function handleReorder(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSlides((current) => {
      const oldIndex = current.findIndex((slide) => slide.id === active.id);
      const newIndex = current.findIndex((slide) => slide.id === over.id);
      const reordered = arrayMove(current, oldIndex, newIndex);

      return reordered.map((slide, index) => ({ ...slide, sortOrder: index }));
    });
    setSaved(false);
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result || '');
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(slideId, variantKey, event) {
    const file = Array.from(event.target.files || []).find((entry) => entry.type.startsWith('image/'));
    event.target.value = '';
    if (!file) return;

    setUploadingSlideId(slideId);
    setSaved(false);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;

      const image = await uploadImageDataUrl(dataUrl, 'kifayatly_covers');
      setSlides((current) =>
        current.map((slide) =>
          slide.id === slideId
            ? {
                ...slide,
                [variantKey]: {
                  url: image.url,
                  publicId: image.publicId,
                  blurDataURL: image.blurDataURL,
                },
              }
            : slide,
        ),
      );
    } catch (error) {
      console.error(`Failed to upload ${variantKey}`, error);
      toast.error(error.message || 'Failed to upload cover image.');
    } finally {
      setUploadingSlideId('');
    }
  }

  async function handleSave() {
    const missingDesktopIndex = slides.findIndex((slide) => !slide.desktopImage?.url);
    if (missingDesktopIndex !== -1) {
      toast.error(`Cover ${missingDesktopIndex + 1} needs a large-screen image before saving.`);
      return;
    }

    setSaving(true);
    setSaved(false);

    const payload = {
      slides: slides.map(({ id, desktopImage, tabletImage, mobileImage, alt }, index) => {
        const slide = {
          desktopImage,
          alt: alt || `Store cover ${index + 1}`,
          sortOrder: index,
        };

        if (tabletImage?.url) slide.tabletImage = tabletImage;
        if (mobileImage?.url) slide.mobileImage = mobileImage;

        return slide;
      }),
    };

    try {
      const response = await fetch('/api/cover-photos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save cover photos');
      }

      setSlides(normalizeSlides(data.data?.slides || payload.slides));
      setSaved(true);
      toast.success('Cover photos updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save cover photos', error);
      toast.error(error.message || 'Failed to save cover photos.');
    } finally {
      setSaving(false);
    }
  }

  return (
      <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Cover Photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage homepage hero slides with dedicated large, medium, and mobile images.
        </p>
      </div>

      <div className="surface-card rounded-xl p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <Images className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Homepage Hero Slides</h3>
              <p className="text-xs text-muted-foreground">
                Add a cover first, then upload desktop, medium, and mobile images separately.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="admin-cta-button" onClick={handleAddSlide}>
            <Plus data-icon="inline-start" />
            Add Cover
          </Button>
        </div>

        {slides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No cover photos yet. Add a cover to create desktop, medium, and mobile upload slots.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
            <SortableContext items={slideIds} strategy={rectSortingStrategy}>
              <div className="grid gap-4">
                {slides.map((slide, index) => (
                  <SortableSlideCard
                    key={slide.id}
                    slide={slide}
                    index={index}
                    onRemove={handleRemoveSlide}
                    onAltChange={handleAltChange}
                    onUpload={handleUpload}
                    uploadingSlideId={uploadingSlideId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving || Boolean(uploadingSlideId)}>
            {saving ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
              {saved ? <span className="text-sm font-medium text-foreground">Cover photos updated successfully.</span> : null}
        </div>
      </div>
    </div>
  );
}

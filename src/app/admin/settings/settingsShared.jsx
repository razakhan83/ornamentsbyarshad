import Image from 'next/image';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function normalizeAnnouncementMessages(messages = [], fallbackText = '') {
  const rawMessages = Array.isArray(messages) && messages.length > 0
    ? messages
    : String(fallbackText || '')
        .split(/\r?\n|[|•]+/)
        .map((text, index) => ({ id: `announcement-${index + 1}`, text, isActive: true }));

  return rawMessages
    .map((entry, index) => ({
      id: String(entry?.id || `announcement-${index + 1}`).trim(),
      text: String(entry?.text || '').trim(),
      isActive: entry?.isActive !== false,
    }))
    .filter((entry) => entry.text);
}

export function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <section className="surface-card rounded-xl p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function ToggleField({ checked, onCheckedChange, title, description }) {
  return (
    <Field orientation="horizontal" className="items-start justify-between rounded-lg border border-border bg-muted/35 px-4 py-3">
      <FieldContent>
        <FieldLabel>{title}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  );
}

export function LogoUploadCard({
  field,
  label,
  hint,
  surfaceClassName,
  imageClassName,
  imageStyle,
  emptyMessage = 'Upload a transparent PNG, SVG, or WebP logo.',
  inputPlaceholder = 'https://res.cloudinary.com/...',
  value,
  onChange,
  uploading,
  onUpload,
}) {
  return (
    <Field className="rounded-2xl border border-border bg-background/75 p-4">
      <FieldContent className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <FieldLabel>{label}</FieldLabel>
            <FieldDescription>{hint}</FieldDescription>
          </div>
          <div className="flex items-center gap-2">
            {value ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => onChange(field, '')}
                disabled={uploading}
              >
                <X data-icon="inline-start" />
                Remove
              </Button>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {uploading ? 'Uploading' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(event) => onUpload(field, event)}
              />
            </label>
          </div>
        </div>

        <div className={`relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border border-border ${surfaceClassName}`}>
          {value ? (
            <Image
              src={value}
              alt={`${label} preview`}
              width={280}
              height={88}
              sizes="(max-width: 768px) 100vw, 320px"
              className={imageClassName}
              style={imageStyle}
            />
          ) : (
            <div className="flex max-w-56 flex-col items-center gap-2 px-5 py-8 text-center text-sm text-muted-foreground">
              <ImagePlus className="size-5" />
              <span>{emptyMessage}</span>
            </div>
          )}
        </div>

        <Input
          value={value || ''}
          onChange={(event) => onChange(field, event.target.value)}
          placeholder={inputPlaceholder}
        />
      </FieldContent>
    </Field>
  );
}

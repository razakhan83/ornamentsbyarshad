'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, RadioTower, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SettingSection, ToggleField } from '@/app/admin/settings/settingsShared';

export default function AdminSocialSettingsClient({ initialSettings }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...initialSettings });

  function handleChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save settings');
      }

      setForm(data.data);
      setSaved(true);
      toast.success('Social & Tracking settings updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="surface-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-border">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
            Channels & Pixels
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Social & Tracking</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Manage customer contact links, social destinations, and tracking pixels (Facebook & TikTok) in one place.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <Image
            src="/undraw_social-ideas_3znc.svg"
            alt="Social Marketing Illustration"
            width={160}
            height={130}
            className="h-auto w-[130px] sm:w-[150px] object-contain select-none opacity-95"
            priority
          />
        </div>
      </div>

      <div className="space-y-6">
        <SettingSection
          icon={RadioTower}
          title="Social & Tracking"
          description="Manage customer contact links, social destinations, and tracking credentials in one place."
        >
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel>WhatsApp Number</FieldLabel>
              <FieldContent>
                <Input
                  value={form.whatsappNumber || ''}
                  onChange={(event) => handleChange('whatsappNumber', event.target.value)}
                  placeholder="923001234567"
                />
                <FieldDescription className="mt-1.5">
                  Used by the floating contact button, footer CTA, and checkout handoff. Format: country code + number without spaces.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Facebook Page URL</FieldLabel>
              <Input
                value={form.facebookPageUrl || ''}
                onChange={(event) => handleChange('facebookPageUrl', event.target.value)}
                placeholder="https://facebook.com/your-page"
              />
            </Field>

            <Field>
              <FieldLabel>Instagram URL</FieldLabel>
              <Input
                value={form.instagramUrl || ''}
                onChange={(event) => handleChange('instagramUrl', event.target.value)}
                placeholder="https://instagram.com/your-handle"
              />
            </Field>
          </FieldGroup>

          <ToggleField
            checked={!!form.trackingEnabled}
            onCheckedChange={(value) => handleChange('trackingEnabled', value)}
            title="Enable tracking"
            description="Loads browser pixels and sends purchase events when credentials are configured."
          />

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Facebook Pixel ID</FieldLabel>
              <Input
                value={form.facebookPixelId || ''}
                onChange={(event) => handleChange('facebookPixelId', event.target.value)}
                placeholder="123456789012345"
              />
            </Field>

            <Field>
              <FieldLabel>TikTok Pixel ID</FieldLabel>
              <Input
                value={form.tiktokPixelId || ''}
                onChange={(event) => handleChange('tiktokPixelId', event.target.value)}
                placeholder="C123ABC456DEF"
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Facebook Conversions API Token</FieldLabel>
              <Input
                value={form.facebookConversionsApiToken || ''}
                onChange={(event) => handleChange('facebookConversionsApiToken', event.target.value)}
                placeholder="EAAG..."
              />
            </Field>

            <Field>
              <FieldLabel>Facebook Test Event Code</FieldLabel>
              <Input
                value={form.facebookTestEventCode || ''}
                onChange={(event) => handleChange('facebookTestEventCode', event.target.value)}
                placeholder="TEST12345"
              />
            </Field>

            <Field>
              <FieldLabel>TikTok Access Token</FieldLabel>
              <Input
                value={form.tiktokAccessToken || ''}
                onChange={(event) => handleChange('tiktokAccessToken', event.target.value)}
                placeholder="ttk_..."
              />
            </Field>
          </FieldGroup>
        </SettingSection>

        <div className="flex items-center gap-4 pb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="admin-cta-button">
            {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
          {saved ? <span className="text-sm font-medium text-foreground">Settings updated successfully.</span> : null}
        </div>
      </div>
    </div>
  );
}

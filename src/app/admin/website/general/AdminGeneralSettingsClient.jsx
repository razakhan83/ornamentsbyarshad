'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, Save, Store } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingSection } from '@/app/admin/settings/settingsShared';

export default function AdminGeneralSettingsClient({ initialSettings }) {
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
      toast.success('General settings updated successfully.');
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
            Store Identity
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">General Information</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Core store details used in email communication, invoice PDFs, and customer support.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <Image
            src="/undraw_landing-page_zc5e.svg"
            alt="Website Setup Illustration"
            width={160}
            height={130}
            className="h-auto w-[130px] sm:w-[150px] object-contain select-none opacity-95"
            priority
          />
        </div>
      </div>

      <div className="space-y-6">
        <SettingSection
          icon={Store}
          title="General Information"
          description="Core store details used in email communication, invoices, and customer support."
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Store Name</FieldLabel>
              <Input
                value={form.storeName || ''}
                onChange={(event) => handleChange('storeName', event.target.value)}
                placeholder="China Unique Store"
              />
            </Field>
            <Field>
              <FieldLabel>Support Email</FieldLabel>
              <Input
                type="email"
                value={form.supportEmail || ''}
                onChange={(event) => handleChange('supportEmail', event.target.value)}
                placeholder="support@chinauniquestore.com"
              />
            </Field>
            <Field>
              <FieldLabel>Business Address</FieldLabel>
              <Textarea
                value={form.businessAddress || ''}
                onChange={(event) => handleChange('businessAddress', event.target.value)}
                placeholder="Shop #12, Block A, Gulshan..."
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>Email Logo Size (%)</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min="40"
                  max="200"
                  step="5"
                  value={form.emailLogoScalePercent ?? 100}
                  onChange={(event) => handleChange('emailLogoScalePercent', event.target.value)}
                  placeholder="100"
                />
                <FieldDescription className="mt-1.5">
                  Controls the logo size in order emails. Default is 100%.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Invoice Logo Size (%)</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min="40"
                  max="200"
                  step="5"
                  value={form.invoiceLogoScalePercent ?? 100}
                  onChange={(event) => handleChange('invoiceLogoScalePercent', event.target.value)}
                  placeholder="100"
                />
                <FieldDescription className="mt-1.5">
                  Controls the logo size in downloaded invoices. Default is 100%.
                </FieldDescription>
              </FieldContent>
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

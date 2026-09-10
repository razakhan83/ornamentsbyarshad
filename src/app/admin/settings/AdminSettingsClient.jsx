// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { Loader2, RadioTower, Save, ShieldCheck, Store, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerAnimations';
import { SettingSection, ToggleField } from './settingsShared';

function AdminAccessSection() {
  const [configuredAdmins, setConfiguredAdmins] = useState([]);
  const [dynamicAdmins, setDynamicAdmins] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const res = await fetch('/api/settings/admins');
        const data = await res.json();
        if (data.success) {
          setConfiguredAdmins(data.data.configuredAdmins || []);
          setDynamicAdmins(data.data.dynamicAdmins || []);
        }
      } catch {
        toast.error('Failed to load admin list.');
      } finally {
        setLoadingList(false);
      }
    }

    fetchAdmins();
  }, []);

  async function handleAddAdmin(event) {
    event.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    setAdding(true);
    try {
      const res = await fetch('/api/settings/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add admin');
      setDynamicAdmins(data.data);
      setNewEmail('');
      toast.success(`${trimmed} added as admin.`);
    } catch (error) {
      toast.error(error.message || 'Failed to add admin.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveAdmin(email) {
    setRemovingEmail(email);
    try {
      const res = await fetch('/api/settings/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to remove admin');
      setDynamicAdmins(data.data);
      toast.success(`${email} removed from admin access.`);
    } catch (error) {
      toast.error(error.message || 'Failed to remove admin.');
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <SettingSection
      icon={ShieldCheck}
      title="Access Management"
      description="Configured admin accounts from environment variables always keep access. Additional admins can be managed here."
    >
      <form onSubmit={handleAddAdmin} className="flex gap-2">
        <Input
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          placeholder="admin@example.com"
          className="flex-1 rounded-md border-slate-300"
          required
        />
        <Button
          type="submit"
          disabled={adding || !newEmail.trim()}
          size="sm"
          className="admin-cta-button shrink-0"
        >
          {adding ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
          Add Admin
        </Button>
      </form>

      {loadingList ? (
        <StaggerContainer className="space-y-2 pt-2">
          {[1, 2].map((item) => (
            <StaggerItem key={item}>
              <Skeleton className="h-11 rounded-lg w-full" />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <StaggerContainer className="space-y-5 pt-1">
          <StaggerItem className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Configured admins</p>
            {configuredAdmins.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                No configured admin emails found in environment variables.
              </p>
            ) : (
              <ul className="space-y-2">
                {configuredAdmins.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">{email}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                      Protected
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </StaggerItem>

          <StaggerItem className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Additional admins</p>
            {dynamicAdmins.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                No additional admins yet. Add one above.
              </p>
            ) : (
              <ul className="space-y-2">
                {dynamicAdmins.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">{email}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveAdmin(email)}
                      disabled={removingEmail === email}
                      title={`Remove ${email}`}
                    >
                      {removingEmail === email ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </StaggerItem>
        </StaggerContainer>
      )}
    </SettingSection>
  );
}

export default function AdminSettingsClient({ initialSettings, isConfiguredAdmin }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    ...initialSettings,
  });

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save settings');
      }

      setForm(data.data);
      setSaved(true);
      toast.success('Settings updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage store details, customer contact channels, tracking credentials, and admin access.
        </p>
      </div>

      <StaggerContainer className="space-y-6">
        <StaggerItem>
        <SettingSection
          icon={Store}
          title="General Information"
          description="Core store details used in email communication, invoices, and customer support."
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Store Name</FieldLabel>
              <Input
                value={form.storeName}
                onChange={(event) => handleChange('storeName', event.target.value)}
                placeholder="China Unique Store"
              />
            </Field>
            <Field>
              <FieldLabel>Support Email</FieldLabel>
              <Input
                type="email"
                value={form.supportEmail}
                onChange={(event) => handleChange('supportEmail', event.target.value)}
                placeholder="support@chinauniquestore.com"
              />
            </Field>
            <Field>
              <FieldLabel>Business Address</FieldLabel>
              <Textarea
                value={form.businessAddress}
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
        </StaggerItem>

        <StaggerItem>
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
                  value={form.whatsappNumber}
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
                value={form.facebookPageUrl}
                onChange={(event) => handleChange('facebookPageUrl', event.target.value)}
                placeholder="https://facebook.com/your-page"
              />
            </Field>

            <Field>
              <FieldLabel>Instagram URL</FieldLabel>
              <Input
                value={form.instagramUrl}
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
                value={form.facebookPixelId}
                onChange={(event) => handleChange('facebookPixelId', event.target.value)}
                placeholder="123456789012345"
              />
            </Field>

            <Field>
              <FieldLabel>TikTok Pixel ID</FieldLabel>
              <Input
                value={form.tiktokPixelId}
                onChange={(event) => handleChange('tiktokPixelId', event.target.value)}
                placeholder="C123ABC456DEF"
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Facebook Conversions API Token</FieldLabel>
              <Input
                value={form.facebookConversionsApiToken}
                onChange={(event) => handleChange('facebookConversionsApiToken', event.target.value)}
                placeholder="EAAG..."
              />
            </Field>

            <Field>
              <FieldLabel>Facebook Test Event Code</FieldLabel>
              <Input
                value={form.facebookTestEventCode}
                onChange={(event) => handleChange('facebookTestEventCode', event.target.value)}
                placeholder="TEST12345"
              />
            </Field>

            <Field>
              <FieldLabel>TikTok Access Token</FieldLabel>
              <Input
                value={form.tiktokAccessToken}
                onChange={(event) => handleChange('tiktokAccessToken', event.target.value)}
                placeholder="ttk_..."
              />
            </Field>
          </FieldGroup>
        </SettingSection>
        </StaggerItem>

        <StaggerItem className="flex items-center gap-4 pb-4">
          <Button onClick={handleSave} disabled={saving} size="sm" className="admin-cta-button">
            {saving ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
          {saved ? <span className="text-sm font-medium text-foreground">Settings updated successfully.</span> : null}
        </StaggerItem>

        {isConfiguredAdmin ? <StaggerItem><AdminAccessSection /></StaggerItem> : null}
      </StaggerContainer>
    </div>
  );
}

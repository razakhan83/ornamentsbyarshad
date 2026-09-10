// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BellRing, ExternalLink, ImagePlus, LayoutGrid, Loader2, Pencil, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { uploadImageDataUrl } from '@/lib/cloudinaryUpload';
import {
  LogoUploadCard,
  normalizeAnnouncementMessages,
  SettingSection,
  ToggleField,
} from '@/app/admin/settings/settingsShared';

export default function AdminStoreSetupClient({ initialSettings }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [form, setForm] = useState({
    ...initialSettings,
    announcementBarMessages: normalizeAnnouncementMessages(
      initialSettings?.announcementBarMessages,
      initialSettings?.announcementBarText
    ),
  });
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  const faviconPreviewSize = Math.min(96, Math.max(32, Number(form.faviconSizePx) || 64));

  function handleChange(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
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

  async function handleImageUpload(field, event) {
    const file = Array.from(event.target.files || []).find((entry) => entry.type.startsWith('image/'));
    event.target.value = '';
    if (!file) return;

    setUploadingField(field);
    setSaved(false);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;

      const image = await uploadImageDataUrl(dataUrl, 'kifayatly_branding');
      handleChange(field, image.url);
      toast.success(
        field === 'lightLogoUrl'
          ? 'Light logo uploaded.'
          : field === 'darkLogoUrl'
            ? 'Dark logo uploaded.'
            : 'Favicon uploaded.'
      );
    } catch (error) {
      console.error(`Failed to upload ${field}`, error);
      toast.error(error.message || 'Failed to upload image.');
    } finally {
      setUploadingField('');
    }
  }

  function handleAddAnnouncementMessage() {
    const trimmed = newAnnouncementMessage.trim();
    if (!trimmed) return;

    handleChange('announcementBarMessages', [
      ...form.announcementBarMessages,
      {
        id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `announcement-${Date.now()}`,
        text: trimmed,
        isActive: true,
      },
    ]);
    setNewAnnouncementMessage('');
  }

  function handleEditAnnouncementStart(message) {
    setEditingAnnouncementId(message.id);
    setEditingAnnouncementText(message.text);
  }

  function handleEditAnnouncementSave() {
    const trimmed = editingAnnouncementText.trim();
    if (!trimmed || !editingAnnouncementId) return;

    handleChange(
      'announcementBarMessages',
      form.announcementBarMessages.map((message) =>
        message.id === editingAnnouncementId ? { ...message, text: trimmed } : message
      )
    );
    setEditingAnnouncementId(null);
    setEditingAnnouncementText('');
  }

  function handleEditAnnouncementCancel() {
    setEditingAnnouncementId(null);
    setEditingAnnouncementText('');
  }

  function handleDeleteAnnouncementMessage(id) {
    handleChange(
      'announcementBarMessages',
      form.announcementBarMessages.filter((message) => message.id !== id)
    );
    if (editingAnnouncementId === id) {
      handleEditAnnouncementCancel();
    }
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
        throw new Error(data.error || data.message || 'Failed to save store setup');
      }

      setForm({
        ...data.data,
        announcementBarMessages: normalizeAnnouncementMessages(
          data.data?.announcementBarMessages,
          data.data?.announcementBarText
        ),
      });
      setSaved(true);
      toast.success('Store setup updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save store setup', error);
      toast.error(error.message || 'Failed to save store setup.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Store Setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep storefront layout and branding controls together with the same roomy admin UI.
        </p>
      </div>

      <div className="space-y-6">
        <SettingSection
          icon={LayoutGrid}
          title="Home Layout Settings"
          description="Open the dedicated builder to manage hero slides, section order, banners, and category blocks."
        >
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Open Home Page Builder</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Edit the homepage layout without touching storefront code.
              </p>
            </div>
            <Link href="/admin/home-page" className="shrink-0">
              <Button type="button" variant="outline" size="sm" className="admin-cta-button w-full md:w-auto">
                <ExternalLink data-icon="inline-start" />
                Home Page Builder
              </Button>
            </Link>
          </div>
        </SettingSection>

        <SettingSection
          icon={LayoutGrid}
          title="Navbar & Logo Size"
          description="Control the logo scale used in the storefront header and footer."
        >
          <Field className="max-w-xl">
            <FieldLabel>Navbar & Footer Logo Size (%)</FieldLabel>
            <FieldContent>
              <Input
                type="number"
                min="60"
                max="200"
                step="5"
                value={form.logoScalePercent ?? 100}
                onChange={(event) => handleChange('logoScalePercent', event.target.value)}
                placeholder="100"
              />
              <FieldDescription className="mt-1.5">
                Default is 100%. Lower values keep the navbar cleaner, while higher values make the brand more prominent.
              </FieldDescription>
            </FieldContent>
          </Field>
        </SettingSection>

        <SettingSection
          icon={ImagePlus}
          title="Logo Configuration"
          description="Upload both storefront logo variants so the brand stays sharp on light and dark surfaces."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <LogoUploadCard
              field="lightLogoUrl"
              label="Light Mode Logo"
              hint="Used on dark backgrounds like the footer and dark brand surfaces."
              surfaceClassName="bg-[#082118]"
              imageClassName="h-auto max-h-16 w-auto object-contain"
              value={form.lightLogoUrl}
              onChange={handleChange}
              uploading={uploadingField === 'lightLogoUrl'}
              onUpload={handleImageUpload}
            />
            <LogoUploadCard
              field="darkLogoUrl"
              label="Dark Mode Logo"
              hint="Used on light backgrounds like the navbar and admin previews."
              surfaceClassName="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,244,0.98))]"
              imageClassName="h-auto max-h-16 w-auto object-contain"
              value={form.darkLogoUrl}
              onChange={handleChange}
              uploading={uploadingField === 'darkLogoUrl'}
              onUpload={handleImageUpload}
            />
          </div>
        </SettingSection>

        <SettingSection
          icon={ImagePlus}
          title="Favicon"
          description="Upload the icon shown in browser tabs and bookmarks. Square artwork works best."
        >
          <div className="max-w-xl">
            <LogoUploadCard
              field="faviconUrl"
              label="Store Favicon"
              hint="Recommended size is at least 64x64 pixels. You can increase the export size below for sharper rendering."
              surfaceClassName="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,244,0.98))]"
              imageClassName="rounded-xl object-contain"
              imageStyle={{ width: `${faviconPreviewSize}px`, height: `${faviconPreviewSize}px` }}
              emptyMessage="Upload a square PNG, SVG, or ICO favicon."
              value={form.faviconUrl}
              onChange={handleChange}
              uploading={uploadingField === 'faviconUrl'}
              onUpload={handleImageUpload}
            />
            <Field className="mt-4">
              <FieldLabel>Favicon Output Size (px)</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  min="32"
                  max="256"
                  step="16"
                  value={form.faviconSizePx ?? 64}
                  onChange={(event) => handleChange('faviconSizePx', event.target.value)}
                  placeholder="64"
                />
                <FieldDescription className="mt-1.5">
                  Controls the generated favicon resolution from 32px to 256px for crisper browser icons.
                </FieldDescription>
              </FieldContent>
            </Field>
          </div>
        </SettingSection>

        <SettingSection
          icon={BellRing}
          title="Announcement Bar"
          description="Control the top marquee messages shown across the storefront."
        >
          <ToggleField
            checked={!!form.announcementBarEnabled}
            onCheckedChange={(value) => handleChange('announcementBarEnabled', value)}
            title="Show top banner"
            description="Display a promotional banner across the storefront."
          />

          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FieldLabel>Add Announcement Message</FieldLabel>
                <Input
                  value={newAnnouncementMessage}
                  onChange={(event) => setNewAnnouncementMessage(event.target.value)}
                  placeholder="Free delivery on orders above Rs. 3000!"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddAnnouncementMessage}
                disabled={!newAnnouncementMessage.trim()}
                className="admin-cta-button shrink-0"
              >
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              <FieldLabel>Message List</FieldLabel>
              {form.announcementBarMessages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  No announcement messages yet. Add one above.
                </div>
              ) : (
                form.announcementBarMessages.map((message, index) => {
                  const isEditing = editingAnnouncementId === message.id;

                  return (
                    <div key={message.id} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Message {index + 1}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => (isEditing ? handleEditAnnouncementSave() : handleEditAnnouncementStart(message))}
                          >
                            <Pencil data-icon="inline-start" />
                            {isEditing ? 'Save' : 'Edit'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteAnnouncementMessage(message.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editingAnnouncementText}
                            onChange={(event) => setEditingAnnouncementText(event.target.value)}
                            placeholder="Edit announcement message"
                          />
                          <div className="flex items-center gap-2">
                            <Button type="button" size="sm" onClick={handleEditAnnouncementSave} disabled={!editingAnnouncementText.trim()}>
                              Save Changes
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleEditAnnouncementCancel}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground">{message.text}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </SettingSection>

        <div className="flex items-center gap-4 pb-4">
          <Button onClick={handleSave} disabled={saving || Boolean(uploadingField)} size="sm" className="admin-cta-button">
            {saving ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Store Setup'}
          </Button>
          {saved ? <span className="text-sm font-medium text-foreground">Store setup updated successfully.</span> : null}
        </div>
      </div>
    </div>
  );
}

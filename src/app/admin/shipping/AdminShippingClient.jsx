'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Truck, Info, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export default function AdminShippingClient({ initialSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(initialSettings);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        throw new Error(data.error || 'Failed to save shipping settings');
      }

      setSaved(true);
      toast.success('Shipping and courier settings updated successfully.');
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save shipping settings', error);
      toast.error(error.message || 'Failed to save shipping settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Shipping & Delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure delivery charges, courier account integrations, and free shipping rules.
        </p>
      </div>

      {/* Courier Accounts Configuration */}
      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-sky-50 text-sky-700">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Courier & NOC Accounts</CardTitle>
              <CardDescription>Manage courier portal accounts and multi-account booking options.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border p-4 bg-card/60 hover:bg-muted/10 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Enable Secondary NOC Account</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  portal_2: Aam Samaan
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                When enabled, allows choosing between Primary (Unique Items) and Secondary (Aam Samaan) courier accounts when booking parcels and printing slips in Order Management. When disabled, defaults exclusively to the primary account.
              </p>
            </div>
            <Switch
              id="enableSecondaryNoc"
              checked={!!form.enableSecondaryNoc}
              onCheckedChange={(val) => handleChange('enableSecondaryNoc', val)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
              <Truck className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Delivery Rates</CardTitle>
              <CardDescription>Specify charges for Karachi and other cities.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="karachiFee">Karachi Delivery Fee</FieldLabel>
              <FieldContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
                <Input
                  id="karachiFee"
                  type="number"
                  min="0"
                  className="pl-10 h-11 rounded-xl"
                  value={form.karachiDeliveryFee}
                  onChange={(e) => handleChange('karachiDeliveryFee', Number(e.target.value))}
                />
              </div>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="outsideKarachiFee">Outside Karachi Fee</FieldLabel>
              <FieldContent>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
                <Input
                  id="outsideKarachiFee"
                  type="number"
                  min="0"
                  className="pl-10 h-11 rounded-xl"
                  value={form.outsideKarachiDeliveryFee}
                  onChange={(e) => handleChange('outsideKarachiDeliveryFee', Number(e.target.value))}
                />
              </div>
              </FieldContent>
            </Field>
          </FieldGroup>

          <Separator />

          <Field>
            <FieldLabel htmlFor="freeThreshold">Free Shipping Threshold</FieldLabel>
            <FieldContent>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
              <Input
                id="freeThreshold"
                type="number"
                min="0"
                className="pl-10 h-11 rounded-xl"
                value={form.freeShippingThreshold}
                onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
              />
            </div>
            <FieldDescription className="pt-1 flex items-center gap-1.5">
              <Info className="size-3" />
              Orders exceeding this amount will have zero shipping charges.
            </FieldDescription>
            </FieldContent>
          </Field>

          <div className="pt-4">
            <Button 
                onClick={handleSave} 
                disabled={saving} 
                size="lg"
                className="w-full sm:w-auto px-8 rounded-xl font-semibold shadow-md active:scale-95 transition-all"
            >
              {saving ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Shipping Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

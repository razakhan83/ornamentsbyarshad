'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, Landmark } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function AdminPaymentSettingsClient({ initialSettings }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    bankDepositEnabled: initialSettings?.bankDepositEnabled ?? false,
    bankDepositAccountDetails: initialSettings?.bankDepositAccountDetails || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankDepositEnabled: formData.bankDepositEnabled,
          bankDepositAccountDetails: formData.bankDepositAccountDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to save settings');
      }

      toast.success('Payment settings saved successfully.');
      router.refresh();
    } catch (error) {
      toast.error(error.message || 'Failed to save payment settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Payment Methods</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your store&apos;s payment options.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="min-w-32 shadow-sm">
          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="surface-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="size-5 text-primary" />
              <CardTitle>Bank Deposit / Transfer</CardTitle>
            </div>
            <CardDescription>
              Allow customers to place orders by manually transferring funds to your bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldGroup>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base">Enable Bank Deposit</FieldLabel>
                  <FieldDescription>
                    Show this payment option during checkout.
                  </FieldDescription>
                </div>
                <Switch
                  checked={formData.bankDepositEnabled}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bankDepositEnabled: checked }))}
                />
              </div>

              {formData.bankDepositEnabled && (
                <Field className="animate-in fade-in slide-in-from-top-2">
                  <FieldLabel htmlFor="bankDepositAccountDetails">Account Details</FieldLabel>
                  <Textarea
                    id="bankDepositAccountDetails"
                    name="bankDepositAccountDetails"
                    value={formData.bankDepositAccountDetails}
                    onChange={handleChange}
                    placeholder="Bank Name: XYZ Bank&#10;Account Title: China Unique&#10;Account Number: 1234567890"
                    rows={5}
                  />
                  <FieldDescription>
                    These details will be shown to the customer when they select Bank Deposit at checkout.
                  </FieldDescription>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

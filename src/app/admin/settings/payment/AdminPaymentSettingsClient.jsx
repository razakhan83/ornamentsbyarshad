'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, CreditCard, Landmark, Copy, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPaymentSettingsClient({ initialSettings }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [formData, setFormData] = useState({
    bankDepositEnabled: initialSettings?.bankDepositEnabled ?? false,
    bankDepositAccountDetails: initialSettings?.bankDepositAccountDetails || '',
    // AsaanPay Gateway
    asaanPayEnabled: initialSettings?.asaanPayEnabled ?? false,
    asaanPayTitle: initialSettings?.asaanPayTitle || 'AsaanPay (Debit/Credit Card, EasyPaisa, JazzCash)',
    asaanPayEnvironment: initialSettings?.asaanPayEnvironment || 'sandbox',
    asaanPayMerchantId: initialSettings?.asaanPayMerchantId || '',
    asaanPayApiKey: initialSettings?.asaanPayApiKey || '',
    asaanPayApiSecret: initialSettings?.asaanPayApiSecret || '',
    asaanPayWebhookSecret: initialSettings?.asaanPayWebhookSecret || '',
  });

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/asaanpay`
    : 'https://yourstore.com/api/webhooks/asaanpay';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCopyWebhook = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast.success('Webhook URL copied to clipboard');
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
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
          asaanPayEnabled: formData.asaanPayEnabled,
          asaanPayTitle: formData.asaanPayTitle,
          asaanPayEnvironment: formData.asaanPayEnvironment,
          asaanPayMerchantId: formData.asaanPayMerchantId,
          asaanPayApiKey: formData.asaanPayApiKey,
          asaanPayApiSecret: formData.asaanPayApiSecret,
          asaanPayWebhookSecret: formData.asaanPayWebhookSecret,
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
    <div className="mx-auto max-w-4xl space-y-6 pb-20 admin-page-stack">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Payment Methods
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure AsaanPay digital gateway and offline bank deposit settings.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 px-4 text-xs font-semibold cursor-pointer shrink-0"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* 1. AsaanPay Online Gateway Card (Standard Clean Shadcn) */}
        <Card className="rounded-xl border border-border shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold">AsaanPay Digital Gateway</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Accept Cards (Visa, Mastercard, PayPak), EasyPaisa, and JazzCash at checkout.
                  </CardDescription>
                </div>
              </div>
              <Badge variant={formData.asaanPayEnabled ? 'default' : 'secondary'} className="text-xs">
                {formData.asaanPayEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Enable Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="space-y-0.5">
                <FieldLabel className="text-sm font-medium">Enable AsaanPay</FieldLabel>
                <FieldDescription className="text-xs">
                  Offer AsaanPay instant digital payment option at checkout.
                </FieldDescription>
              </div>
              <Switch
                checked={formData.asaanPayEnabled}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, asaanPayEnabled: checked }))}
              />
            </div>

            {formData.asaanPayEnabled && (
              <FieldGroup className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="asaanPayEnvironment" className="text-xs font-medium">
                      Environment Mode
                    </FieldLabel>
                    <Select
                      value={formData.asaanPayEnvironment}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, asaanPayEnvironment: val }))}
                    >
                      <SelectTrigger id="asaanPayEnvironment" className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox" className="text-xs">Sandbox / Testing</SelectItem>
                        <SelectItem value="live" className="text-xs">Live / Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="asaanPayTitle" className="text-xs font-medium">
                      Checkout Button Title
                    </FieldLabel>
                    <Input
                      id="asaanPayTitle"
                      name="asaanPayTitle"
                      value={formData.asaanPayTitle}
                      onChange={handleChange}
                      placeholder="AsaanPay (Cards, EasyPaisa, JazzCash)"
                      className="h-9 text-xs"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="asaanPayMerchantId" className="text-xs font-medium">
                      Merchant ID / Store Code
                    </FieldLabel>
                    <Input
                      id="asaanPayMerchantId"
                      name="asaanPayMerchantId"
                      value={formData.asaanPayMerchantId}
                      onChange={handleChange}
                      placeholder="e.g. AP_MCH_123456"
                      className="h-9 text-xs font-mono"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="asaanPayApiKey" className="text-xs font-medium">
                      API Public Key / Client ID
                    </FieldLabel>
                    <Input
                      id="asaanPayApiKey"
                      name="asaanPayApiKey"
                      value={formData.asaanPayApiKey}
                      onChange={handleChange}
                      placeholder="pk_live_xxxx or pk_test_xxxx"
                      className="h-9 text-xs font-mono"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="asaanPayApiSecret" className="text-xs font-medium">
                      API Secret Key
                    </FieldLabel>
                    <Input
                      type="password"
                      id="asaanPayApiSecret"
                      name="asaanPayApiSecret"
                      value={formData.asaanPayApiSecret}
                      onChange={handleChange}
                      placeholder="sk_live_xxxx or sk_test_xxxx"
                      className="h-9 text-xs font-mono"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="asaanPayWebhookSecret" className="text-xs font-medium">
                      Webhook Secret (Optional)
                    </FieldLabel>
                    <Input
                      type="password"
                      id="asaanPayWebhookSecret"
                      name="asaanPayWebhookSecret"
                      value={formData.asaanPayWebhookSecret}
                      onChange={handleChange}
                      placeholder="whsec_xxxx"
                      className="h-9 text-xs font-mono"
                    />
                  </Field>
                </div>

                {/* Webhook URL Helper */}
                <Field className="space-y-1.5 pt-1">
                  <FieldLabel className="text-xs font-medium">
                    Webhook Callback URL
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="h-9 text-xs font-mono select-all bg-muted/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhook}
                      className="h-9 text-xs px-3 shrink-0"
                    >
                      {copiedWebhook ? <Check className="size-3.5 text-emerald-600 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                      {copiedWebhook ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <FieldDescription className="text-[11px]">
                    Paste this URL in your AsaanPay merchant dashboard webhooks settings for real-time transaction updates.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            )}
          </CardContent>
        </Card>

        {/* 2. Bank Deposit Card (Standard Clean Shadcn) */}
        <Card className="rounded-xl border border-border shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Landmark className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold">Bank Deposit / Manual Transfer</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Allow customers to manually transfer payments to your bank account.
                  </CardDescription>
                </div>
              </div>
              <Badge variant={formData.bankDepositEnabled ? 'default' : 'secondary'} className="text-xs">
                {formData.bankDepositEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3.5">
              <div className="space-y-0.5">
                <FieldLabel className="text-sm font-medium">Enable Bank Deposit</FieldLabel>
                <FieldDescription className="text-xs">
                  Display bank account numbers and instructions on checkout.
                </FieldDescription>
              </div>
              <Switch
                checked={formData.bankDepositEnabled}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bankDepositEnabled: checked }))}
              />
            </div>

            {formData.bankDepositEnabled && (
              <Field className="space-y-1.5 pt-1">
                <FieldLabel htmlFor="bankDepositAccountDetails" className="text-xs font-medium">
                  Bank Account Details & Instructions
                </FieldLabel>
                <Textarea
                  id="bankDepositAccountDetails"
                  name="bankDepositAccountDetails"
                  value={formData.bankDepositAccountDetails}
                  onChange={handleChange}
                  placeholder="Bank Name: Meezan Bank&#10;Account Title: Ornaments by Arshad&#10;Account Number: 010203040506&#10;IBAN: PK36MEZN0001020304050607"
                  rows={5}
                  className="text-xs font-mono"
                />
              </Field>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

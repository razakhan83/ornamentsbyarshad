'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  Landmark,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
      toast.success('Webhook URL copied to clipboard!');
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

      toast.success('Payment settings and AsaanPay credentials saved successfully.');
      router.refresh();
    } catch (error) {
      toast.error(error.message || 'Failed to save payment settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Payment Gateways & Methods</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure AsaanPay online gateway and offline bank transfer options without touching any code.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="min-w-36 shadow-sm bg-[#121212] text-white hover:bg-neutral-800">
          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* 1. AsaanPay Online Gateway Card */}
        <Card className="surface-card border-[#EAE5DD] shadow-sm">
          <CardHeader className="border-b border-[#EAE5DD]/70 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#A67C52]/10 text-[#A67C52]">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">AsaanPay Online Gateway</CardTitle>
                  <CardDescription>
                    Accept Debit/Credit Cards (Visa, Mastercard, PayPak), EasyPaisa, and JazzCash automatically.
                  </CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                formData.asaanPayEnabled ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
              )}>
                {formData.asaanPayEnabled ? "Active" : "Disabled"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <FieldGroup>
              {/* Enable Switch */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#EAE5DD] bg-[#FAF9F6] p-4">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base font-semibold text-[#121212]">Enable AsaanPay Gateway</FieldLabel>
                  <FieldDescription>
                    Turn ON to offer AsaanPay instant digital payments at checkout.
                  </FieldDescription>
                </div>
                <Switch
                  checked={formData.asaanPayEnabled}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, asaanPayEnabled: checked }))}
                />
              </div>

              {formData.asaanPayEnabled && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Environment Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="asaanPayEnvironment">Environment Mode</FieldLabel>
                      <select
                        id="asaanPayEnvironment"
                        name="asaanPayEnvironment"
                        value={formData.asaanPayEnvironment}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-[#121212] outline-none focus:border-[#A67C52] focus:ring-2 focus:ring-[#A67C52]/20"
                      >
                        <option value="sandbox">Sandbox / Testing (Test mode)</option>
                        <option value="live">Live / Production (Real payments)</option>
                      </select>
                      <FieldDescription>
                        Use Sandbox while verifying and switch to Live when you are ready to accept real customer money.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="asaanPayTitle">Checkout Button Label</FieldLabel>
                      <Input
                        id="asaanPayTitle"
                        name="asaanPayTitle"
                        value={formData.asaanPayTitle}
                        onChange={handleChange}
                        placeholder="AsaanPay (Cards, EasyPaisa, JazzCash)"
                      />
                      <FieldDescription>
                        The label customers see when selecting this payment method.
                      </FieldDescription>
                    </Field>
                  </div>

                  {/* Merchant ID and API Key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="asaanPayMerchantId">Merchant ID / Store Code</FieldLabel>
                      <Input
                        id="asaanPayMerchantId"
                        name="asaanPayMerchantId"
                        value={formData.asaanPayMerchantId}
                        onChange={handleChange}
                        placeholder="e.g. AP_MCH_123456"
                      />
                      <FieldDescription>
                        Provided in your AsaanPay merchant dashboard.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="asaanPayApiKey">API Public Key / Client ID</FieldLabel>
                      <Input
                        id="asaanPayApiKey"
                        name="asaanPayApiKey"
                        value={formData.asaanPayApiKey}
                        onChange={handleChange}
                        placeholder="e.g. pk_live_xxxx or pk_test_xxxx"
                      />
                      <FieldDescription>
                        Your AsaanPay API key for authentication.
                      </FieldDescription>
                    </Field>
                  </div>

                  {/* Secret Keys */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="asaanPayApiSecret">API Secret Key</FieldLabel>
                      <Input
                        type="password"
                        id="asaanPayApiSecret"
                        name="asaanPayApiSecret"
                        value={formData.asaanPayApiSecret}
                        onChange={handleChange}
                        placeholder="sk_live_xxxx or sk_test_xxxx"
                      />
                      <FieldDescription>
                        Kept encrypted and safe in database.
                      </FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="asaanPayWebhookSecret">Webhook Secret / Signature Key</FieldLabel>
                      <Input
                        type="password"
                        id="asaanPayWebhookSecret"
                        name="asaanPayWebhookSecret"
                        value={formData.asaanPayWebhookSecret}
                        onChange={handleChange}
                        placeholder="whsec_xxxx (optional)"
                      />
                      <FieldDescription>
                        Used to verify webhook authenticity.
                      </FieldDescription>
                    </Field>
                  </div>

                  {/* Webhook URL Helper */}
                  <div className="rounded-xl border border-[#A67C52]/30 bg-[#F5EFE6]/60 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A67C52]">
                      <Zap className="size-3.5" />
                      <span>Webhook Callback URL (Paste in AsaanPay Dashboard)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="bg-white text-xs font-mono select-all text-neutral-800"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWebhook}
                        className="shrink-0 bg-white hover:bg-neutral-100"
                      >
                        {copiedWebhook ? <Check className="size-4 text-emerald-600 mr-1" /> : <Copy className="size-4 mr-1" />}
                        {copiedWebhook ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-[11.5px] text-neutral-600 leading-relaxed">
                      Paste this URL in your <strong>AsaanPay Merchant Portal → Webhooks</strong> so your store automatically receives real-time payment success notifications.
                    </p>
                  </div>
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        {/* 2. Bank Deposit / Manual Transfer Card */}
        <Card className="surface-card border-[#EAE5DD] shadow-sm">
          <CardHeader className="border-b border-[#EAE5DD]/70 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#A67C52]/10 text-[#A67C52]">
                  <Landmark className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Bank Deposit / Direct Transfer</CardTitle>
                  <CardDescription>
                    Allow customers to transfer payment manually to your bank account and share slip.
                  </CardDescription>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                formData.bankDepositEnabled ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
              )}>
                {formData.bankDepositEnabled ? "Active" : "Disabled"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <FieldGroup>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#EAE5DD] bg-[#FAF9F6] p-4">
                <div className="space-y-0.5">
                  <FieldLabel className="text-base font-semibold text-[#121212]">Enable Bank Deposit</FieldLabel>
                  <FieldDescription>
                    Show manual bank transfer instructions at checkout.
                  </FieldDescription>
                </div>
                <Switch
                  checked={formData.bankDepositEnabled}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, bankDepositEnabled: checked }))}
                />
              </div>

              {formData.bankDepositEnabled && (
                <Field className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <FieldLabel htmlFor="bankDepositAccountDetails">Bank Account Details</FieldLabel>
                  <Textarea
                    id="bankDepositAccountDetails"
                    name="bankDepositAccountDetails"
                    value={formData.bankDepositAccountDetails}
                    onChange={handleChange}
                    placeholder="Bank Name: Meezan Bank&#10;Account Title: Ornaments by Arshad&#10;Account Number: 010203040506&#10;IBAN: PK36MEZN0001020304050607"
                    rows={5}
                  />
                  <FieldDescription>
                    These details will be displayed to the customer during checkout when they select Bank Deposit.
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

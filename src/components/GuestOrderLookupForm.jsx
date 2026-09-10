'use client';

import { useState, useTransition } from 'react';
import { ClipboardList, Loader2, Phone, PackageSearch, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { trackGuestOrderAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';

export default function GuestOrderLookupForm() {
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    if (!orderId.trim() || !phone.trim()) return;
    setSubmitError('');

    startTransition(async () => {
      try {
        const result = await trackGuestOrderAction({
          orderId: orderId.trim(),
          phone: phone.trim(),
        });

        if (result?.success && result.redirectUrl) {
          toast.success('Order found. Opening tracking details.');
          router.push(result.redirectUrl);
          return;
        }

        const message = result?.message || 'We could not find an order matching those details.';
        setSubmitError(message);
        toast.error(message);
      } catch {
        const message = 'Something went wrong while checking your order.';
        setSubmitError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="guest-order-id" className="block text-sm font-medium text-foreground mb-1.5">
          Order ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <ClipboardList className="size-4.5" />
          </div>
          <input
            id="guest-order-id"
            type="text"
            placeholder="e.g. ORD-ABC123"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value.toUpperCase())}
            className="w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-border bg-background shadow-2xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            disabled={isPending}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="guest-order-phone" className="block text-sm font-medium text-foreground mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Phone className="size-4.5" />
          </div>
          <input
            id="guest-order-phone"
            type="tel"
            placeholder="e.g. 0300 1234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full h-11 pl-10 pr-4 text-sm rounded-lg border border-border bg-background shadow-2xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            disabled={isPending}
            required
          />
        </div>
        {submitError && (
          <p className="mt-1.5 text-xs font-medium text-destructive">{submitError}</p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full h-11 text-sm font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all mt-2"
        disabled={isPending || !orderId.trim() || !phone.trim()}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Checking Status...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Track Order
            <ArrowRight className="size-4" />
          </span>
        )}
      </Button>
    </form>
  );
}

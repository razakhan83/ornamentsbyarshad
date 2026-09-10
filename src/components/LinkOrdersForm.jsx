'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { linkOrdersAction } from '@/app/actions';
import { toast } from 'sonner';

export default function LinkOrdersForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSubmitError('');

    startTransition(async () => {
      try {
        const result = await linkOrdersAction(phone.trim());
        if (result.success) {
          setIsSuccess(true);
          toast.success(result.message);
          // Refresh data seamlessly via Next.js router
          router.refresh();
        } else {
          const message = result.message || 'Could not find any orders with this phone number.';
          setSubmitError(message);
          toast.error(message);
        }
      } catch {
        setSubmitError('Something went wrong. Please try again.');
        toast.error('Something went wrong. Please try again.');
      }
    });
  }

  if (isSuccess) {
    return (
      <Alert className="border-success/20 bg-success/10 text-success">
        <CheckCircle2 className="size-5 shrink-0" />
        <AlertTitle>Orders linked successfully</AlertTitle>
        <AlertDescription className="text-success/90">
          Refreshing your orders so the newly linked items appear.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LinkIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Missing an order?</CardTitle>
            <CardDescription>
              Enter the phone number used in previous orders to link them to your account.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={submitError ? 'true' : undefined}>
              <FieldLabel htmlFor="link-orders-phone">Phone number</FieldLabel>
              <FieldDescription>
                Use the number you gave at checkout, for example `0300 1234567`.
              </FieldDescription>
              <InputGroup className="min-h-11 rounded-xl">
                <InputGroupAddon align="inline-start" className="pl-3 text-muted-foreground">
                  <InputGroupText>
                    <Phone />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="link-orders-phone"
                  type="tel"
                  placeholder="0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                  disabled={isPending}
                  aria-invalid={Boolean(submitError)}
                  required
                />
                <InputGroupAddon align="inline-end" className="pr-2">
                  <InputGroupButton
                    type="submit"
                    size="sm"
                    className="h-8 min-w-[120px] rounded-lg px-4"
                    disabled={isPending || !phone.trim()}
                  >
                    {isPending ? <Loader2 className="animate-spin" /> : 'Link Orders'}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{submitError}</FieldError>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

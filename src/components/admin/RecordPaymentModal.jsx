'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isRedirectError } from 'next/dist/client/components/redirect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordPaymentAction } from '@/app/actions/invoice.actions';

export default function RecordPaymentModal({ isOpen, invoice, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceDue ? String(invoice.balanceDue) : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('Cash');
      setReferenceNumber('');
      setNotes('');
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await recordPaymentAction({
        invoiceId: invoice._id,
        amount: numAmt,
        paymentDate,
        paymentMode,
        referenceNumber,
        notes,
      });

      if (res?.success) {
        toast.success(`Payment ${res.paymentNumber} recorded successfully!`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      if (isRedirectError(error)) throw error;
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} • {invoice.customerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex justify-between items-center text-sm">
            <span className="text-zinc-600 font-medium">Balance Due:</span>
            <span className="font-bold text-emerald-700 text-base">
              Rs. {Number(invoice.balanceDue || 0).toLocaleString('en-PK')}
            </span>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase text-zinc-700">
              Amount Received (PKR) *
            </FieldLabel>
            <Input
              type="number"
              min="1"
              max={invoice.balanceDue || undefined}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="text-xs font-semibold uppercase">Payment Date</FieldLabel>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold uppercase">Payment Mode</FieldLabel>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="JazzCash">JazzCash</SelectItem>
                    <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                    <SelectItem value="Online">Online Card</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase">Reference / Transaction ID</FieldLabel>
            <Input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. TXN-984214"
            />
          </Field>

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase">Notes</FieldLabel>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
            />
          </Field>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting && <Loader2 data-icon="inline-start" className="animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

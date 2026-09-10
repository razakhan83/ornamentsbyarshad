'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateInvoice } from '@/lib/invoice-generator';
import { toast } from 'sonner';

export default function InvoiceButton({ order, branding }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await generateInvoice(order, branding);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast.error('Failed to generate invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="gap-2 h-8 text-xs bg-background hover:bg-muted"
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Download className="size-3" />
      )}
      <span>Invoice</span>
    </Button>
  );
}

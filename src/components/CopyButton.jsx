'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </Button>
  );
}

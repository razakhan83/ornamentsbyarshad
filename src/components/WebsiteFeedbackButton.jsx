'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WebsiteFeedbackModal = dynamic(() => import('@/components/WebsiteFeedbackModal'), {
  ssr: false,
});

export default function WebsiteFeedbackButton({ className = '', variant = 'list-item', children }) {
  const [open, setOpen] = useState(false);

  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors cursor-pointer", className)}
        >
          {children || 'Give Website Feedback'}
        </button>

        {open && <WebsiteFeedbackModal open={open} onOpenChange={setOpen} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-2 transition-colors hover:text-foreground cursor-pointer text-left", className)}
      >
        <ChevronRight className="size-4 shrink-0" />
        <span>{children || 'Website Feedback'}</span>
      </button>

      {open && <WebsiteFeedbackModal open={open} onOpenChange={setOpen} />}
    </>
  );
}

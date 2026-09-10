'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MobileBackButton({ className }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 rounded-full bg-background/80 backdrop-blur-md shadow-sm border border-border/50", className)}
      onClick={() => router.back()}
      aria-label="Go back"
    >
      <ArrowLeft className="size-5" />
    </Button>
  );
}

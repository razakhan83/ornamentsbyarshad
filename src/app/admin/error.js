'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AdminError({ error, reset, unstable_retry }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    if (typeof reset === 'function') {
      reset();
    } else if (typeof unstable_retry === 'function') {
      unstable_retry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An error occurred in the admin panel. Please try again.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleRetry} variant="outline" className="gap-2">
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button onClick={() => router.push('/admin')} className="gap-2">
          <LayoutDashboard className="size-4" />
          Dashboard
        </Button>
      </div>
    </div>
  );
}

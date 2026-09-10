'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to load chunk') ||
      error?.message?.includes('Loading chunk')
    ) {
      const lastReload = sessionStorage.getItem('chunk_reload_timestamp');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 8000) {
        sessionStorage.setItem('chunk_reload_timestamp', String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A critical error occurred. Please try again.
            </p>
          </div>
          <button
            onClick={() => (typeof unstable_retry === 'function' ? unstable_retry() : window.location.reload())}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted active:scale-[0.98]"
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

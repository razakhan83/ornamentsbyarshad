'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F6] px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[#F4F2EE] text-[#A67C52]">
        <AlertCircle className="size-8 stroke-[1.5]" />
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-[#121212] uppercase">
        Application Error
      </h1>

      <p className="mt-2 text-xs sm:text-sm text-[#737373] max-w-sm mx-auto">
        An unexpected error occurred. Please try refreshing the page or return to the storefront.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button 
          type="button"
          onClick={() => reset()} 
          className="h-11 px-8 rounded-none bg-[#121212] hover:bg-neutral-800 text-white font-medium text-xs uppercase tracking-[0.2em] transition-colors cursor-pointer"
        >
          Try Again
        </Button>
        <Button 
          render={<Link href="/" />}
          nativeButton={false}
          variant="outline"
          className="h-11 px-8 rounded-none border-[#E8E5DF] bg-white hover:bg-[#F4F2EE] text-[#121212] font-medium text-xs uppercase tracking-[0.2em] transition-colors"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}


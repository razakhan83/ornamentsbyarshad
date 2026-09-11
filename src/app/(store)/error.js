'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StoreError({ error, reset }) {
  useEffect(() => {
    console.error('Store route error:', error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[#F4F2EE] text-[#A67C52]">
        <AlertCircle className="size-8 stroke-[1.5]" />
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide text-[#121212] uppercase">
        Something Went Wrong
      </h1>

      <p className="mt-2 text-xs sm:text-sm text-[#737373] max-w-sm mx-auto">
        We encountered an issue loading this section. Your cart and data are safe.
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
    </section>
  );
}


'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function StoreError({ error, reset }) {
  useEffect(() => {
    console.error('Store route error:', error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-5 flex items-center justify-center select-none">
        <Image
          src="/undraw_fixing-bugs_13mt.svg"
          alt="Something went wrong"
          width={220}
          height={160}
          className="h-auto w-[180px] sm:w-[220px] object-contain"
          priority
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Something Went Wrong
      </h1>

      <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
        We encountered an issue loading this section. Your cart and data are safe.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button 
          type="button"
          onClick={() => reset()} 
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm shadow-none transition-all active:scale-[0.98] cursor-pointer"
        >
          Try Again
        </button>
        <Link 
          href="/"
          className="h-10 px-5 inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground font-bold text-xs sm:text-sm shadow-none transition-all active:scale-[0.98]"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

export default function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubscribed(true);
      toast.success('Thank you for subscribing!');
      setEmail('');
    }, 300);
  };

  return (
    <div className="mb-10 rounded-2xl border border-border bg-card p-4 sm:p-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row md:gap-8">
        <div className="w-full min-w-0 flex-1 text-center md:max-w-lg md:text-left">
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-xl md:text-2xl text-balance">
            Subscribe for discounts &amp; new arrivals
          </h2>
          
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Get updates on exclusive discounts and new arrivals.
          </p>

          {isSubscribed ? (
            <div className="mt-4 inline-block rounded-lg bg-muted px-4 py-2 text-xs sm:text-sm font-semibold text-foreground">
              Thank you for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:max-w-md mx-auto md:mx-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isLoading}
                className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="h-11 px-5 w-full sm:w-auto rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-none transition-all active:scale-[0.98] shrink-0 cursor-pointer"
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>

        <div className="hidden min-[400px]:flex shrink-0 items-center justify-center select-none">
          <Image
            src="/undraw_subscribe_w8sz.svg"
            alt="Subscribe"
            width={160}
            height={110}
            className="h-auto w-[88px] sm:w-[150px] object-contain"
          />
        </div>
      </div>
    </div>
  );
}

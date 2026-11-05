'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Check } from 'lucide-react';

export default function FooterNewsletter({ inline = true }) {
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
      toast.success('Welcome to the Ornaments by Arshad Private Circle.');
      setEmail('');
    }, 400);
  };

  if (isSubscribed) {
    return (
      <div className="border border-[#A67C52]/30 bg-[#FAF9F6] p-3 text-xs uppercase tracking-wider font-semibold text-[#A67C52] flex items-center gap-2">
        <Check className="size-4" />
        <span>Welcome to our private circle</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address..."
        required
        disabled={isLoading}
        className="h-11 w-full rounded-none border border-[#E8E5DF] bg-white px-3.5 text-xs text-[#121212] placeholder:text-[#888888] focus:border-[#A67C52] focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={isLoading}
        aria-label="Subscribe to newsletter"
        className="h-11 px-6 inline-flex items-center justify-center rounded-none bg-[#A67C52] hover:bg-[#8F673F] text-white font-semibold text-xs uppercase tracking-[0.18em] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        {isLoading ? '...' : 'Subscribe'}
      </button>
    </form>
  );
}

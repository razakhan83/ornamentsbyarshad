'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { Loader2 } from 'lucide-react';

export default function SignInFormClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        toast.error('Invalid email or password');
      } else if (res?.url) {
        window.location.href = res.url;
      }
    } catch (error) {
      toast.error('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="mb-3 sm:mb-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="name@example.com" required autoComplete="email" className="h-10 sm:h-12 text-sm sm:text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button type="button" className="text-[10px] sm:text-sm font-medium text-primary hover:underline transition-all duration-200 active:scale-95" tabIndex={-1}>
              Forgot password?
            </button>
          </div>
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" className="h-10 sm:h-12 text-sm sm:text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20" />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isLoading} className="mt-5 sm:mt-8 h-10 sm:h-12 w-full text-sm sm:text-base font-semibold active:scale-[0.98] transition-transform duration-200">
        {isLoading && <Loader2 className="mr-2 size-5 animate-spin" />}
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}

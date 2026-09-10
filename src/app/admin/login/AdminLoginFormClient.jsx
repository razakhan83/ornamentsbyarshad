'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function AdminLoginFormClient({ guestModeEnabled }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/admin';
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
        toast.error('Invalid admin credentials');
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
          <Input id="email" name="email" type="email" placeholder="admin@example.com" required autoComplete="email" className="h-10 sm:h-12 text-sm sm:text-base" />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button type="button" className="text-[10px] sm:text-sm font-medium text-primary hover:underline" tabIndex={-1}>
              Forgot password?
            </button>
          </div>
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" className="h-10 sm:h-12 text-sm sm:text-base" />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isLoading} className="mt-5 sm:mt-8 h-10 sm:h-12 w-full text-sm sm:text-base font-semibold">
        {isLoading ? 'Authenticating...' : 'Sign In'}
      </Button>

      <div className="relative mb-4 mt-6 sm:mb-8 sm:mt-10">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[9px] sm:text-xs uppercase tracking-wider">
          <span className="bg-background px-2 sm:px-4 text-muted-foreground font-medium">Or continue with</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        <GoogleSignInButton callbackUrl={callbackUrl} className="h-10 sm:h-12 text-xs sm:text-base" />

        {guestModeEnabled && (
          <Button 
            type="button"
            variant="outline" 
            className="h-10 sm:h-12 w-full text-xs sm:text-base font-semibold bg-muted/50" 
            onClick={() => signIn('credentials', { isGuest: 'true', callbackUrl })}
          >
            Explore as Guest
          </Button>
        )}
      </div>
    </form>
  );
}

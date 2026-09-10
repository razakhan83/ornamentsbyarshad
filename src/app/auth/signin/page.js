import Image from 'next/image';
import Link from 'next/link';
import { HelpCircle, CheckCircle2, Truck, Tag, Heart as HeartIcon } from 'lucide-react';
import { Suspense } from 'react';

import StoreLogo from '@/components/StoreLogo';
import { getStoreSettings } from '@/lib/data';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import SignInFormClient from './SignInFormClient';
import SignInBackButton from './SignInBackButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const metadata = {
  title: 'Sign In',
};

export default async function SignInPage() {
  const settings = await getStoreSettings();

  return (
    <>
      {/* ========================================= */}
      {/* MOBILE LAYOUT (Hidden on Desktop) */}
      {/* ========================================= */}
      <div className="lg:hidden relative flex min-h-[100dvh] w-full flex-col bg-[#006B5F] overflow-hidden">
        
        {/* Top Header Section */}
        <div className="relative flex flex-col justify-end pt-12 pb-12 px-8 shrink-0 text-white min-h-[22dvh] overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-20">
              <SignInBackButton iconClassName="size-6 drop-shadow-sm" text="" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white" />
            </div>
            
            {/* Animated Hello Section */}
            <div className="relative z-10 font-sans mt-auto">
               <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-1 text-white">Hello</h1>
               <p className="text-white/90 text-sm sm:text-base font-normal">Welcome to {settings.storeName || 'our store'}</p>
            </div>
        </div>

        {/* Bottom Card Section */}
        <div className="relative flex-1 bg-background rounded-t-3xl px-6 pt-8 pb-6 flex flex-col mt-[-20px] shadow-sm z-20 border-t border-border">
          <div className="mx-auto w-full max-w-sm flex flex-col flex-1">
              <div className="mb-8 text-left">
                 <h2 className="text-2xl font-bold text-foreground mb-1">Login</h2>
                 <p className="text-muted-foreground text-sm">Sign in to securely access your account.</p>
              </div>

              <div className="flex flex-col gap-4">
                 <GoogleSignInButton className="h-12 rounded-xl text-sm font-medium bg-card ring-1 ring-inset ring-border hover:bg-muted/50 border-0" />
              </div>

              <div className="text-center text-[13px] font-medium mt-6">
                <Dialog>
                  <DialogTrigger className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2 group">
                    <HelpCircle className="size-4 text-primary" />
                    <span>Why should I sign in?</span>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl p-6 border border-border bg-card shadow-lg">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl font-bold text-foreground mb-3 text-left pr-8">
                        Benefits of Signing In
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                      
                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="size-4.5 text-primary" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-foreground">Fast & Easy Checkout</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Save your delivery details for a seamless checkout experience.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <Truck className="size-4.5 text-primary" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-foreground">Track Orders Easily</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">View your order history and track the status of your deliveries.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <Tag className="size-4.5 text-primary" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-foreground">Exclusive Discounts</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Get access to member-only offers and special deals.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <HeartIcon className="size-4.5 text-primary" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-foreground">Save Your Favorites</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Create a wishlist of products to easily buy them later.</p>
                        </div>
                      </div>

                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Vector Image for Mobile */}
              <div className="flex-1 flex items-center justify-center mt-6 mb-4 min-h-0">
                  <Image 
                    src="/tablet-login-bro.svg" 
                    alt="Login Illustration" 
                    width={280}
                    height={220}
                    className="w-full max-w-[220px] h-auto object-contain opacity-90 mix-blend-multiply dark:mix-blend-normal"
                    priority
                  />
              </div>
          </div>

          {/* Privacy Policy and Terms of Service */}
          <div className="mt-auto pt-4 text-center flex items-center justify-center gap-3 text-xs text-muted-foreground w-full">
              <Link href="/terms-of-service" className="hover:text-foreground transition-colors hover:underline underline-offset-2">
                Terms & Conditions
              </Link>
              <span className="size-1 rounded-full bg-border"></span>
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors hover:underline underline-offset-2">
                Privacy Policy
              </Link>
          </div>
        </div>
      </div>


      {/* ========================================= */}
      {/* DESKTOP LAYOUT (Hidden on Mobile) */}
      {/* ========================================= */}
      <div className="hidden lg:flex relative h-[100dvh] w-full flex-col items-center justify-center bg-background p-0 sm:p-4 lg:p-8 overflow-hidden">
        <div className="relative z-10 mx-auto flex w-full h-full max-h-[100dvh] sm:max-h-[700px] flex-col overflow-hidden sm:rounded-xl border sm:border border-border bg-card lg:flex-row lg:max-w-[1100px] lg:h-[680px] shadow-xs">
          
          {/* PC: Left - Illustration */}
          <div className="relative flex w-full shrink-0 flex-col items-center justify-center bg-muted/30 p-4 sm:p-6 lg:w-1/2 lg:p-14 border-r border-border">
            
            {/* Back Button Inside Card */}
            <div className="absolute top-4 left-4 lg:top-8 lg:left-8 z-20">
              <SignInBackButton />
            </div>

            <div className="relative z-10 flex w-full flex-col items-center text-center">
              <div className="mb-8">
                <StoreLogo
                  storeName={settings.storeName}
                  lightLogoUrl={settings.lightLogoUrl}
                  darkLogoUrl={settings.darkLogoUrl}
                  logoScalePercent={settings.logoScalePercent}
                  variant="default"
                />
              </div>

              {/* Enhanced Svg Illustration Container */}
              <div className="relative w-full max-w-[280px] aspect-4/3 flex items-center justify-center">
                <Image
                  src="/tablet-login-bro.svg"
                  alt="Sign In Illustration"
                  fill
                  className="object-contain drop-shadow-sm select-none mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 hover:scale-105"
                  priority
                />
              </div>

              <div className="mt-8 text-center max-w-xs">
                <h3 className="text-base font-semibold text-foreground">Fast & Secure Access</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Track your orders effortlessly, save delivery addresses, and unlock exclusive discounts.
                </p>
              </div>
            </div>
          </div>

          {/* PC: Right - Form Section */}
          <div className="relative flex w-full flex-1 flex-col justify-center p-6 sm:p-10 lg:w-1/2 lg:p-14">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sign In</h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Enter your details to access your account.
                </p>
              </div>

              <Suspense fallback={
                <div className="flex flex-col gap-3">
                  <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-12 w-full animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-12 w-full animate-pulse rounded-lg bg-muted/80 mt-2" />
                </div>
              }>
                <SignInFormClient />
              </Suspense>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-card px-3 text-muted-foreground font-medium">OR</span>
                </div>
              </div>

              <GoogleSignInButton className="h-11 text-sm bg-card ring-1 ring-inset ring-border hover:bg-muted/50 border-0" />

              <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <Link href="/terms-of-service" className="font-medium underline underline-offset-4 hover:text-foreground transition-colors">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy-policy" className="font-medium underline underline-offset-4 hover:text-foreground transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

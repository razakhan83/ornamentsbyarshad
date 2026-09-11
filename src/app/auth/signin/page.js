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
      <div className="lg:hidden relative flex min-h-[100dvh] w-full flex-col bg-[#121212] overflow-hidden">
        
        {/* Top Header Section */}
        <div className="relative flex flex-col justify-end pt-12 pb-10 px-8 shrink-0 text-white min-h-[20dvh] overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-20">
              <SignInBackButton iconClassName="size-5 drop-shadow-sm" text="" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#FAF9F6]/90 transition-colors hover:text-[#A67C52]" />
            </div>
            
            {/* Animated Hello Section */}
            <div className="relative z-10 mt-auto">
               <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A67C52] mb-1">Welcome Back</p>
               <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-wider text-[#FAF9F6] font-normal [text-wrap:balance]">
                 {settings.storeName || 'Ornaments'}
               </h1>
            </div>
        </div>

        {/* Bottom Card Section */}
        <div className="relative flex-1 bg-[#FAF9F6] px-6 pt-8 pb-6 flex flex-col shadow-2xl z-20 border-t border-[#E8E5DF]">
          <div className="mx-auto w-full max-w-sm flex flex-col flex-1">
              <div className="mb-6 text-left">
                 <h2 className="font-serif text-2xl font-normal uppercase tracking-wide text-[#121212] mb-1">Client Login</h2>
                 <p className="text-[#737373] text-xs">Sign in to securely access your account and orders.</p>
              </div>

              <div className="flex flex-col gap-4">
                 <GoogleSignInButton className="h-12 rounded-none text-xs uppercase tracking-widest font-medium bg-white ring-1 ring-inset ring-[#E8E5DF] hover:bg-[#F4F2EE] border-0" />
              </div>

              <div className="text-center text-xs font-medium mt-6">
                <Dialog>
                  <DialogTrigger className="text-[#737373] hover:text-[#A67C52] transition-colors inline-flex items-center gap-2 group">
                    <HelpCircle className="size-4 text-[#A67C52]" />
                    <span>Why should I sign in?</span>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] sm:max-w-md rounded-none p-6 border border-[#E8E5DF] bg-[#FAF9F6] shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-lg sm:text-xl font-normal uppercase tracking-wider text-[#121212] mb-3 text-left pr-8">
                        Benefits of Membership
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                      
                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="size-4.5 text-[#A67C52]" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Fast & Easy Checkout</h4>
                          <p className="text-xs text-[#737373] mt-0.5">Save your delivery details for seamless one-click purchasing.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <Truck className="size-4.5 text-[#A67C52]" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Live Order Tracking</h4>
                          <p className="text-xs text-[#737373] mt-0.5">Real-time status updates from our jeweler workshop to your doorstep.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <Tag className="size-4.5 text-[#A67C52]" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Private Invitations</h4>
                          <p className="text-xs text-[#737373] mt-0.5">Exclusive access to new arrival launches and private VIP sales.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="flex items-center justify-center shrink-0 mt-0.5">
                          <HeartIcon className="size-4.5 text-[#A67C52]" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-[#121212]">Curated Wishlist</h4>
                          <p className="text-xs text-[#737373] mt-0.5">Save and curate your personal collection of fine jewelry pieces.</p>
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
                    className="w-full max-w-[200px] h-auto object-contain opacity-80 mix-blend-multiply dark:mix-blend-normal"
                    priority
                  />
              </div>
          </div>

          {/* Privacy Policy and Terms of Service */}
          <div className="mt-auto pt-4 text-center flex items-center justify-center gap-3 text-[11px] text-[#737373] w-full">
              <Link href="/terms-of-service" className="hover:text-[#121212] transition-colors hover:underline underline-offset-2">
                Terms & Conditions
              </Link>
              <span className="size-1 rounded-full bg-[#E8E5DF]"></span>
              <Link href="/privacy-policy" className="hover:text-[#121212] transition-colors hover:underline underline-offset-2">
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

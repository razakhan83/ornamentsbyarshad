import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { Suspense } from 'react';

import StoreLogo from '@/components/StoreLogo';
import { getStoreSettings } from '@/lib/data';
import AdminLoginFormClient from './AdminLoginFormClient';

export const metadata = {
  title: 'Admin Login',
};

export default async function AdminLoginPage() {
  const settings = await getStoreSettings();
  const guestModeEnabled = settings?.guestModeEnabled !== false;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-background p-0 sm:p-4 lg:p-8 overflow-hidden">
      <div className="relative z-10 mx-auto flex w-full h-full max-h-[100dvh] sm:max-h-[700px] flex-col overflow-hidden sm:rounded-xl border sm:border border-border bg-card lg:flex-row lg:max-w-[1100px] lg:h-[680px] shadow-xs">
        
        {/* Mobile: Top / PC: Left - SVG Image */}
        <div className="relative flex w-full shrink-0 flex-col items-center justify-center bg-primary/5 p-4 sm:p-6 lg:w-1/2 lg:p-16">
          
          {/* Back Button Inside Card */}
          <div className="absolute top-4 left-4 lg:top-8 lg:left-8 z-20">
            <Link href="/" className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
              Back
            </Link>
          </div>

          <div className="relative z-10 flex w-full flex-col items-center text-center">
            <div className="mb-0 lg:hidden">
              <StoreLogo
                  storeName={settings.storeName}
                  lightLogoUrl={settings.lightLogoUrl}
                  darkLogoUrl={settings.darkLogoUrl}
                  logoScalePercent={settings.logoScalePercent}
                  variant="dark-surface"
                />
            </div>
            
            <div className="hidden lg:block mb-8">
               <StoreLogo
                  storeName={settings.storeName}
                  lightLogoUrl={settings.lightLogoUrl}
                  darkLogoUrl={settings.darkLogoUrl}
                  logoScalePercent={settings.logoScalePercent}
                  variant="dark-surface"
                />
            </div>
            
            <div className="w-full max-w-[180px] mt-1 sm:max-w-[220px] lg:mt-12 lg:max-w-[480px]">
              <Image 
                src="/work-time-amico.svg" 
                alt="Admin Workspace Illustration" 
                width={500}
                height={500}
                className="mx-auto w-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 hover:scale-105"
                priority
              />
            </div>
          </div>
        </div>

        {/* Mobile: Bottom / PC: Right - Form Data */}
        <div className="flex w-full flex-1 flex-col justify-start pt-6 sm:pt-8 sm:justify-center overflow-hidden p-4 sm:p-8 lg:w-1/2 lg:p-20">
          <div className="mx-auto w-full max-w-[380px]">
            <div className="mb-2 sm:mb-8 flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl xl:text-5xl">Admin Access</h1>
              <p className="mt-0.5 text-[10px] text-foreground/70 sm:text-sm lg:mt-3 lg:text-base">
                Sign in with authorized credentials.
              </p>
            </div>

            <Suspense fallback={
              <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
                <div className="h-12 sm:h-14 lg:h-14 w-full animate-pulse rounded-md bg-muted/60" />
                <div className="h-12 sm:h-14 lg:h-14 w-full animate-pulse rounded-md bg-muted/60" />
                <div className="h-12 sm:h-14 lg:h-14 w-full animate-pulse rounded-md bg-muted/80 mt-2 sm:mt-4 lg:mt-4" />
              </div>
            }>
              <AdminLoginFormClient guestModeEnabled={guestModeEnabled} />
            </Suspense>

            <p className="mt-3 sm:mt-8 lg:mt-10 text-center text-[9px] sm:text-[11px] font-medium text-foreground/70 lg:text-sm">
              Authorized personnel only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

import StoreLogo from '@/components/StoreLogo';
import { getStoreSettings } from '@/lib/data';
import AdminLoginFormClient from './AdminLoginFormClient';

export const metadata = {
  title: 'Admin Access | Ornaments by Arshad',
  description: 'Sign in with authorized administrator credentials to access the management portal.',
};

export default async function AdminLoginPage() {
  const settings = await getStoreSettings();

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#FAF9F6] text-[#121212] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* ── Top Header: Brand Logo & Back to Store Button ── */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 py-2">
        <div className="flex items-center">
          <StoreLogo
            storeName={settings.storeName || "Ornaments by Arshad"}
            lightLogoUrl={settings.lightLogoUrl}
            darkLogoUrl={settings.darkLogoUrl}
            logoScalePercent={settings.logoScalePercent}
            variant="light-surface"
          />
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#737373] hover:text-[#121212] transition-colors py-1.5 px-3 rounded-sm hover:bg-[#F2EFE9]"
        >
          <ArrowLeft className="size-4" />
          <span>Back to store</span>
        </Link>
      </header>

      {/* ── Center Content: Minimalist Admin Card ── */}
      <main className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-[440px] bg-white border border-[#E8E5DF] rounded-sm shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] p-7 sm:p-9">
          <Suspense fallback={
            <div className="space-y-4 py-8 animate-pulse">
              <div className="h-4 w-32 bg-[#F2EFE9] rounded" />
              <div className="h-8 w-48 bg-[#F2EFE9] rounded" />
              <div className="h-11 w-full bg-[#F2EFE9] rounded-sm mt-6" />
              <div className="h-11 w-full bg-[#F2EFE9] rounded-sm" />
              <div className="h-11 w-full bg-[#121212]/10 rounded-sm mt-4" />
            </div>
          }>
            <AdminLoginFormClient />
          </Suspense>
        </div>
      </main>

      {/* ── Footer: Authorized Personnel Only ── */}
      <footer className="w-full max-w-md mx-auto py-3 text-center text-xs text-[#8C8C8C] flex items-center justify-center gap-2">
        <Shield className="size-3.5 text-[#A67C52]" />
        <span>Authorized Personnel Only</span>
      </footer>
    </div>
  );
}

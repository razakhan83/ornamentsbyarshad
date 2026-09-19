import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { authOptions } from '@/lib/auth';
import { getStoreSettings, getUserOrders } from '@/lib/data';
import { getSiteUrl } from '@/lib/siteUrl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GuestOrderLookupForm from '@/components/GuestOrderLookupForm';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import LinkOrdersForm from '@/components/LinkOrdersForm';
import OrdersClient from './OrdersClient';

export const metadata = {
  title: 'Track Your Order | Ornaments by Arshad',
  description: 'Enter your order ID or phone number to check live delivery timeline and order tracking.',
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersPageSkeleton() {
  return (
    <main className="w-full bg-background pt-8 pb-16 px-4">
      <div className="w-full max-w-xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
        <div className="h-40 w-full bg-muted/40 rounded-sm" />
      </div>
    </main>
  );
}

async function OrdersContent() {
  return (
    <main className="w-full bg-[#FAF9F6] min-h-[70vh] pt-6 pb-16 sm:pt-10 sm:pb-20 px-4">
      <div className="w-full max-w-xl mx-auto">
        {/* Clean Luxury Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-[11px] font-sans uppercase tracking-[0.24em] text-[#A67C52] font-semibold block mb-1">
            Order Status
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-wide text-[#121212] uppercase">
            Track Your Order
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-neutral-500 font-sans max-w-md mx-auto">
            Enter your order reference ID or mobile number below to view your live tracking and delivery status.
          </p>
        </div>

        {/* Direct Clean Tracking Lookup Form */}
        <GuestOrderLookupForm />
      </div>
    </main>
  );
}

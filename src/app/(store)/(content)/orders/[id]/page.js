import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { authOptions } from '@/lib/auth';
import mongooseConnect from '@/lib/mongooseConnect';
import { getStoreSettings } from '@/lib/data';
import { getSiteUrl } from '@/lib/siteUrl';
import Order from '@/models/Order';
import OrderDetailsClient from './OrderDetailsClient';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Order Details | China Unique',
  description: 'View your order status and invoice.',
};

export default function SingleOrderPage({ params, searchParams }) {
  return (
    <Suspense fallback={<SingleOrderSkeleton />}>
      <SingleOrderContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function SingleOrderSkeleton() {
  return (
    <main className="min-h-screen bg-background pb-20 pt-12">
      <div className="container mx-auto max-w-6xl px-4 animate-pulse">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-4 w-32 bg-muted rounded mb-4"></div>
            <div className="h-9 w-64 bg-muted rounded mb-2"></div>
            <div className="h-4 w-96 max-w-full bg-muted rounded"></div>
          </div>
          <div className="h-10 w-40 bg-muted rounded-md"></div>
        </div>

        {/* Content */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {/* Left Column */}
          <div className="flex flex-col gap-4 md:gap-6 md:col-span-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-32 flex flex-col justify-center p-6 gap-4">
              <div className="h-6 w-48 bg-muted rounded"></div>
              <div className="h-4 w-32 bg-muted rounded"></div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-96 p-6">
              <div className="h-6 w-32 bg-muted rounded mb-2"></div>
              <div className="h-4 w-24 bg-muted rounded mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="size-12 rounded bg-muted shrink-0"></div>
                    <div className="h-4 flex-1 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4 md:gap-6 md:col-span-1">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-48 p-6">
              <div className="h-6 w-32 bg-muted rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-full bg-muted rounded"></div>
              </div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-48 p-6">
              <div className="h-6 w-40 bg-muted rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 w-3/4 bg-muted rounded"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

async function SingleOrderContent({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { id } = resolvedParams;
  const { token } = resolvedSearchParams;

  await mongooseConnect();
  
  // 1. Fetch Order
  const orderDoc = await Order.findById(id).lean();
  
  if (!orderDoc) {
    redirect('/orders');
  }

  const order = JSON.parse(JSON.stringify(orderDoc));
  const session = await getServerSession(authOptions);

  // 2. Security Check (Magic Link vs Session)
  const isAuthorizedViaToken = token && order.secureToken === token;
  const isAuthorizedViaSession = session?.user?.email && order.customerEmail === session.user.email;

  if (!isAuthorizedViaToken && !isAuthorizedViaSession) {
    // If neither authorized, force login
    redirect('/api/auth/signin?callbackUrl=/orders/' + id);
  }

  const settings = await getStoreSettings();
  const siteUrl = getSiteUrl();
  const invoiceBranding = {
    storeName: settings.storeName,
    supportEmail: settings.supportEmail,
    businessAddress: settings.businessAddress,
    lightLogoUrl: settings.lightLogoUrl,
    darkLogoUrl: settings.darkLogoUrl,
    invoiceLogoScalePercent: settings.invoiceLogoScalePercent,
    baseUrl: siteUrl,
    returnPolicyUrl: `${siteUrl}/refund-policy`,
  };

  return (
    <main className="min-h-screen bg-background pb-20 pt-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link 
              href="/orders" 
              className="group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to My Orders
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Order Status</h1>
            <p className="mt-2 text-muted-foreground">Manage your shipment and download your invoice below.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" render={<Link href="/" />} nativeButton={false}>Continue Shopping</Button>
          </div>
        </div>

        <OrderDetailsClient order={order} invoiceBranding={invoiceBranding} />
        
        {!session && (
          <div className="mt-8 rounded-xl border border-accent/25 bg-accent/12 p-6 text-center">
            <p className="text-sm font-medium text-accent-foreground">
              Viewing as Guest. <Link href="/api/auth/signin" className="font-bold underline hover:text-foreground">Sign in</Link> to save this order to your account permanently.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

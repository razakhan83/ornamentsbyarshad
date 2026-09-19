'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminPaymentsClient() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6 admin-page-stack">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Payments Received
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit history & gateway transaction ledger
          </p>
        </div>

        <Link href="/admin/settings/payment">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Payment Settings
          </Button>
        </Link>
      </div>

      {/* Simple Clean Message Card */}
      <div className="rounded-sm border border-border bg-card p-8 sm:p-12 text-center space-y-2 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Working on it
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          Payments ledger will activate with gateway integration
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed pt-1">
          Automated payment tracking and online card logs will go live once AsaanPay or digital payment gateways are enabled.
        </p>
      </div>
    </div>
  );
}

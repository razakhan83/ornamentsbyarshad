import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Live Traffic | Admin',
};

export default function LiveTrafficPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6 admin-page-stack">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Live Traffic
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Storefront traffic & visitor analytics
          </p>
        </div>

        <Link href="/admin">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Simple Clean Message Card */}
      <div className="rounded-sm border border-border bg-card p-8 sm:p-12 text-center space-y-2 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Working on it
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          Live Traffic is currently under development
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed pt-1">
          We are integrating a new live analytics API. Real-time visitor counts and geo-location tracking will be available soon.
        </p>
      </div>
    </div>
  );
}

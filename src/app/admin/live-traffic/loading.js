import { Skeleton } from '@/components/ui/skeleton';

export default function LiveTrafficSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-2.5 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md shrink-0" />
      </div>

      {/* 4 Metric Cards Skeleton */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="admin-surface rounded-[0.5rem] border border-border/80 bg-card p-3 sm:p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-6 w-12 rounded" />
              </div>
              <Skeleton className="size-7 sm:size-8 rounded-md shrink-0 ml-2" />
            </div>
          </div>
        ))}
      </section>

      {/* World Map Skeleton */}
      <div className="w-full h-[290px] sm:h-[400px] md:h-[500px] bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs overflow-hidden relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-6 w-28 rounded-lg hidden sm:block" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
            <span className="text-[11px] font-mono text-muted-foreground">Loading Live World Radar...</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-3 w-48 rounded" />
          <Skeleton className="h-3 w-28 rounded hidden sm:block" />
        </div>
      </div>

      {/* Bottom Grid Skeleton (Sessions Table & Top Cities) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Table Skeleton (2 cols) */}
        <div className="lg:col-span-2 border bg-card rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-20 rounded hidden sm:block" />
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities Skeleton (1 col) */}
        <div className="border bg-card rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
            <Skeleton className="size-7 rounded-md" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((city) => (
              <div key={city} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3.5 w-16 rounded" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Card, CardHeader } from '@/components/ui/card';

export default function AdminFeedbackLoading() {
  return (
    <div className="admin-page-stack animate-pulse">
      {/* Page Header Skeleton */}
      <div className="admin-page-header">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-7 w-48 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted/60" />
          </div>
          <div className="h-9 w-24 rounded bg-muted" />
        </div>
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-surface rounded-[0.5rem] border border-border/60 p-3 sm:p-3.5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-6 w-14 rounded bg-muted" />
              </div>
              <div className="size-4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Shell Skeleton */}
      <div className="admin-filter-shell flex flex-col gap-3 md:flex-row md:items-center">
        <div className="h-9 flex-1 rounded bg-muted/60" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded bg-muted/60" />
          <div className="h-9 w-28 rounded bg-muted/60" />
        </div>
      </div>

      {/* Surface Table Skeleton */}
      <div className="admin-surface overflow-hidden rounded-[1.2rem] p-4">
        <div className="space-y-3">
          <div className="h-10 w-full rounded bg-muted/40" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full rounded bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

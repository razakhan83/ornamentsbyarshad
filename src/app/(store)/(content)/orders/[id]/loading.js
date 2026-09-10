import { Skeleton } from '@/components/ui/skeleton';

export default function OrderDetailLoading() {
  return (
    <main className="min-h-screen bg-background pb-20 pt-8 md:pt-12">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-4 w-80 max-w-full rounded" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>

        {/* Content */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {/* Left Column */}
          <div className="flex flex-col gap-4 md:gap-6 md:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col justify-center gap-3">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <div className="space-y-1">
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <div className="space-y-4 pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="size-14 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3.5 w-1/4 rounded" />
                    </div>
                    <Skeleton className="h-4 w-16 rounded ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-36 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

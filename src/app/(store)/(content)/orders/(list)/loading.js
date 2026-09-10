import { Skeleton } from '@/components/ui/skeleton';

function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
      {/* Card Header Strip */}
      <div className="bg-[#F8F9FA] px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <div className="flex flex-row gap-8 sm:gap-16">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 bg-gray-200" />
            <Skeleton className="h-4 w-28 bg-gray-300" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 bg-gray-200" />
            <Skeleton className="h-4 w-20 bg-gray-300" />
          </div>
        </div>
        <div className="space-y-1.5 sm:text-right">
          <Skeleton className="h-4 w-36 bg-gray-300 sm:ml-auto" />
          <Skeleton className="h-3 w-24 bg-gray-200 sm:ml-auto" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-6">
        {/* Status Header */}
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 bg-gray-300" />
          <Skeleton className="h-3.5 w-60 bg-gray-200" />
        </div>

        {/* Progress Tracker Bar */}
        <div className="py-2">
          <Skeleton className="h-2 w-full rounded-full bg-gray-200" />
        </div>

        {/* Item Rows */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Skeleton className="size-16 sm:size-20 rounded-xl bg-gray-200 shrink-0" />
            <div className="space-y-2 min-w-0 flex-1">
              <Skeleton className="h-4 w-48 sm:w-72 bg-gray-300" />
              <Skeleton className="h-3 w-24 bg-gray-200" />
              <Skeleton className="h-3.5 w-20 bg-gray-300" />
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 w-full sm:w-44 shrink-0">
            <Skeleton className="h-9 w-full rounded-xl bg-gray-200" />
            <Skeleton className="h-9 w-full rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-white pb-16 pt-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          {/* Left Column (Main Content) */}
          <div className="w-full lg:flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-9 w-44 bg-gray-300 rounded-lg" />
              <Skeleton className="h-6 w-10 bg-gray-200 rounded-full" />
            </div>

            {/* Tabs & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex p-1 bg-[#F1F3F5] rounded-xl w-max gap-1">
                <Skeleton className="h-9 w-32 rounded-lg bg-white shadow-sm" />
                <Skeleton className="h-9 w-36 rounded-lg bg-gray-200/60" />
              </div>
              <Skeleton className="h-10 w-40 rounded-xl bg-[#F1F3F5]" />
            </div>

            {/* Orders Cards List */}
            <div className="space-y-6">
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-6 space-y-4">
              <Skeleton className="h-5 w-32 bg-gray-300" />
              <Skeleton className="h-3.5 w-full bg-gray-200" />
              <Skeleton className="h-3.5 w-4/5 bg-gray-200" />
              <Skeleton className="h-11 w-full rounded-xl bg-primary/20" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

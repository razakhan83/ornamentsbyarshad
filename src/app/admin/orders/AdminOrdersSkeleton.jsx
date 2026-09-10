import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">Orders</h2>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Tabs */}
      <div className="hidden md:flex flex-col gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8.5 w-14 rounded-lg" />
          <Skeleton className="h-8.5 w-20 rounded-lg" />
          <Skeleton className="h-8.5 w-36 rounded-lg" />
          <Skeleton className="h-8.5 w-28 rounded-lg" />
          <Skeleton className="h-8.5 w-24 rounded-lg" />
          <Skeleton className="h-8.5 w-24 rounded-lg" />
          <Skeleton className="h-8.5 w-32 rounded-lg" />
          <Skeleton className="h-8.5 w-28 rounded-lg" />
          <Skeleton className="h-8.5 w-28 rounded-lg" />
          <div className="mx-1 h-5 w-px bg-border" />
          <Skeleton className="h-8.5 w-24 rounded-lg" />
        </div>
      </div>

      {/* Mobile Select */}
      <div className="md:hidden">
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>

      {/* Filter Toolbar */}
      <div className="admin-filter-shell flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 flex-1 min-w-0">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-full md:max-w-sm rounded-lg" />
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2 border-t border-border/50 pt-2 md:border-0 md:pt-0 shrink-0">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md hidden sm:flex" />
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block shadow-xs">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <th className="w-8 px-2 py-2 text-center">
                <Skeleton className="size-3.5 rounded-sm mx-auto" />
              </th>
              <th className="px-2.5 py-2"><Skeleton className="h-3 w-14 rounded" /></th>
              <th className="px-2.5 py-2"><Skeleton className="h-3 w-20 rounded" /></th>
              <th className="px-2 py-2"><Skeleton className="h-3 w-12 rounded" /></th>
              <th className="px-2.5 py-2"><Skeleton className="h-3 w-16 rounded" /></th>
              <th className="px-2 py-2"><Skeleton className="h-3 w-12 rounded" /></th>
              <th className="px-2.5 py-2"><Skeleton className="h-3 w-24 rounded" /></th>
              <th className="px-2.5 py-2"><Skeleton className="h-3 w-20 rounded" /></th>
              <th className="px-2.5 py-2 text-right"><Skeleton className="h-3 w-14 rounded ml-auto" /></th>
              <th className="px-2.5 py-2 text-center"><Skeleton className="h-3 w-14 rounded mx-auto" /></th>
              <th className="w-16 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index} className="hover:bg-muted/30">
                <td className="w-8 px-2 py-2 text-center">
                  <Skeleton className="size-3.5 rounded-sm mx-auto" />
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3.5 w-14 rounded" />
                    <Skeleton className="h-3 w-6 rounded" />
                  </div>
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                  </div>
                </td>
                <td className="px-2 py-2"><Skeleton className="h-3.5 w-12 rounded" /></td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-16 rounded" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                </td>
                <td className="px-2 py-2"><Skeleton className="h-3 w-10 rounded" /></td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-22 rounded font-mono" />
                    <Skeleton className="h-2.5 w-14 rounded" />
                  </div>
                </td>
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-18 rounded" />
                    <Skeleton className="h-2.5 w-12 rounded" />
                  </div>
                </td>
                <td className="px-2.5 py-2 text-right"><Skeleton className="h-3.5 w-14 rounded ml-auto" /></td>
                <td className="px-2.5 py-2 text-center"><Skeleton className="h-4 w-16 rounded-full mx-auto" /></td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Skeleton className="h-6 w-10 rounded-md" />
                    <Skeleton className="size-6 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

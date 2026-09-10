import { AdminTableSkeleton } from '@/components/AdminDashboardSkeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">Manual Customers</h2>
      </div>
      <AdminTableSkeleton rows={8} />
    </div>
  );
}

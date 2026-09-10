import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Box, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdminTopProductsPage } from '@/lib/data';
import { requireAdmin } from '@/lib/requireAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Top Performing Products | Admin',
};

export const instant = false;

export default async function TopPerformingProductsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = 20;

  const data = await getAdminTopProductsPage({ page, limit });

  return (
    <div className="admin-page-stack w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/admin/products" className="hover:text-foreground transition-colors">Products</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.04em] text-foreground md:text-[1.75rem]">
            Top Performing Products
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="admin-surface rounded-xl border border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground w-16">Rank</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Price</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Units Sold</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Est. Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.items.map((product, i) => {
                const rank = (page - 1) * limit + i + 1;
                return (
                  <tr key={product._id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-center text-muted-foreground font-medium text-[13px]">#{rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted flex items-center justify-center">
                          {product.image ? (
                            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                          ) : (
                            <Box className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <Link href={`/admin/products/edit/${product.actualProductId}`} className="font-medium text-[13px] text-foreground hover:underline truncate max-w-[200px] sm:max-w-[300px]">
                            {product.name}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">{product.StockStatus}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[13px]">
                       Rs. {product.currentPrice?.toLocaleString('en-PK')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.showOnStore ? 'default' : 'secondary'} className="text-[10px]">
                        {product.showOnStore ? 'Live' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-[14px] text-foreground">
                      {product.totalSold}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[13px] text-muted-foreground">
                      Rs. {product.revenue?.toLocaleString('en-PK')}
                    </td>
                  </tr>
                );
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No sales data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 px-4 py-3 gap-3">
            <p className="text-[12px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * limit, data.total)}</span> of{' '}
              <span className="font-medium text-foreground">{data.total}</span> products
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" asChild>
                  <Link href={`/admin/top-performing-products?page=${page - 1}`}>
                    <ChevronLeft className="size-3.5 mr-1" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled>
                  <ChevronLeft className="size-3.5 mr-1" />
                  Previous
                </Button>
              )}
              {page < data.totalPages ? (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" asChild>
                  <Link href={`/admin/top-performing-products?page=${page + 1}`}>
                    Next
                    <ChevronRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-[12px]" disabled>
                  Next
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

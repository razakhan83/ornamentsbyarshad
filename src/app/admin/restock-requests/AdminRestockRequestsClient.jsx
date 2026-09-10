'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { updateStockRequestStatus } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

export default function AdminRestockRequestsClient({
  initialRequests,
  total,
  totalPages,
  currentPage,
  initialStatus,
  initialProductSearch,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(initialProductSearch || '');

  function createQueryString(name, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    if (name !== 'page') params.set('page', '1');
    return params.toString();
  }

  const handleStatusFilterChange = (val) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString('status', val));
    });
  };

  const handleUpdateStatus = async (id, newStatus) => {
    startTransition(async () => {
      const res = await updateStockRequestStatus(id, newStatus);
      if (res?.success) {
        toast.success(`Request marked as ${newStatus}`);
      } else {
        toast.error(res?.message || 'Failed to update request');
      }
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    startTransition(() => {
      router.push(pathname + '?' + createQueryString('product', searchValue));
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Restock Requests</h1>
          <p className="text-sm text-muted-foreground">Manage user notifications for out-of-stock products</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div className="flex items-center gap-2">
             <CardTitle>Requests ({total})</CardTitle>
             {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-[250px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search product..."
                className="w-full pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>
            <Select value={initialStatus} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Contact</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialRequests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{req.userName || 'Guest'}</span>
                          {req.whatsappNumber && <span className="text-sm text-muted-foreground">WA: {req.whatsappNumber}</span>}
                          {req.email && <span className="text-sm text-muted-foreground">{req.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/products/${req.productSlug || req.productId}`} target="_blank" className="font-medium hover:underline text-primary">
                          {req.productName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'contacted' ? 'default' : 'outline'} className="capitalize">
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                             <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(req._id, 'contacted')} disabled={isPending}>Mark Contacted</Button>
                             <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(req._id, 'closed')} disabled={isPending}>Close</Button>
                          </div>
                        )}
                        {req.status === 'contacted' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(req._id, 'closed')} disabled={isPending}>Close</Button>
                        )}
                        {req.status === 'closed' && (
                          <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(req._id, 'pending')} disabled={isPending}><RefreshCw className="h-4 w-4 mr-2"/> Reopen</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => {
                    startTransition(() => {
                      router.push(pathname + '?' + createQueryString('page', currentPage - 1));
                    });
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => {
                    startTransition(() => {
                      router.push(pathname + '?' + createQueryString('page', currentPage + 1));
                    });
                  }}
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { requireAdmin } from '@/lib/requireAdmin';
import Link from 'next/link';
import { Plus, Ticket } from 'lucide-react';
import mongooseConnect from '@/lib/mongooseConnect';
import Coupon from '@/models/Coupon';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { CouponActions } from './CouponActions';

export default async function CouponCodesPage() {
  await requireAdmin();
  
  await mongooseConnect();
  // Fetch coupons, sorted by creation date (newest first)
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  
  return (
    <div className="flex flex-col gap-6 w-full p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupon Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage discount codes and promotional offers.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/marketing/coupons/create" />}>
          <Plus className="mr-2 size-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>A list of all coupons configured in your store.</CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Ticket /></EmptyMedia>
                <EmptyTitle>No coupons found</EmptyTitle>
                <EmptyDescription>You haven&apos;t created any coupons yet.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button nativeButton={false} render={<Link href="/admin/marketing/coupons/create" />} variant="outline">
                  Create your first coupon
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon._id.toString()}>
                      <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                      <TableCell className="capitalize">{coupon.discountType.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {coupon.discountType === 'percentage' && `${coupon.discountValue}%`}
                        {coupon.discountType === 'fixed_amount' && `Rs. ${coupon.discountValue}`}
                        {coupon.discountType === 'free_shipping' && 'Free'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(coupon.startDate).toLocaleDateString()} - {new Date(coupon.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.usedCount} / {coupon.usageLimitPerCoupon || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CouponActions couponId={coupon._id.toString()} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

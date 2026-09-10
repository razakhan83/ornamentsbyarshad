'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Package, Truck, ExternalLink, MessageSquare, CheckCircle2, Star } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import InvoiceButton from '@/components/InvoiceButtonWrapper';
import NocTrackingModal from '@/components/NocTrackingModal';
import ReviewModal from '@/components/ReviewModal';
import { Button } from '@/components/ui/button';
import { normalizeOrderStatus } from '@/lib/order-status';
import { formatSmartTimeAgo, formatFullDateTime } from '@/lib/timeAgo';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function OrderDetailsClient({ order, invoiceBranding }) {
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  useEffect(() => {
    if (order?.orderId && order?.secureToken) {
      try {
        const guestOrders = JSON.parse(localStorage.getItem('guest_orders') || '[]');
        const exists = guestOrders.some(o => o.orderId === order.orderId);
        if (!exists) {
          const updated = [{
            orderId: order.orderId,
            secureToken: order.secureToken,
            items: (order.items || []).map(i => ({ productId: i.productId, name: i.name })),
            timestamp: Date.now()
          }, ...guestOrders].slice(0, 20);
          localStorage.setItem('guest_orders', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore localStorage error
      }
    }
  }, [order?.orderId, order?.secureToken, order?.items]);

  // Auto-open review popup on visit if delivered and not yet reviewed
  useEffect(() => {
    if (!currentOrder) return;
    const rawStatus = normalizeOrderStatus(currentOrder.status);
    const isDelivered = rawStatus === 'Delivered';
    const isAllReviewed = currentOrder.items?.length > 0 && currentOrder.items.every(i => i.isReviewed);

    if (isDelivered && !isAllReviewed && currentOrder?.orderId) {
      let isDismissAll = false;
      let isDismissedPermanently = false;
      let isRemindLaterThisSession = false;
      try {
        isDismissAll = localStorage.getItem('feedback_dismiss_all') === 'true';
        isDismissedPermanently = localStorage.getItem(`feedback_dismissed_${currentOrder.orderId}`) === 'true';
        isRemindLaterThisSession = sessionStorage.getItem(`feedback_remind_later_${currentOrder.orderId}`) === 'true';
      } catch (e) {}

      if (!isDismissAll && !isDismissedPermanently && !isRemindLaterThisSession) {
        const timer = setTimeout(() => {
          setShowReviewModal(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentOrder]);

  if (!currentOrder) return null;
  const rawStatus = normalizeOrderStatus(currentOrder.status);
  const isDelivered = rawStatus === 'Delivered';
  const isAllReviewed = currentOrder.items?.length > 0 && currentOrder.items.every(i => i.isReviewed);

  const handleReviewAction = (action) => {
    if (action === 'later') {
      try {
        sessionStorage.setItem(`feedback_remind_later_${currentOrder?.orderId}`, 'true');
      } catch (e) {}
    } else if (action === 'dismiss' || action === 'dismiss_all') {
      try {
        localStorage.setItem(`feedback_dismissed_${currentOrder?.orderId}`, 'true');
        if (action === 'dismiss_all') {
          localStorage.setItem('feedback_dismiss_all', 'true');
        }
      } catch (e) {}
    }
  };
  
  // Customer-facing status mapping: Packed -> In Process
  const displayStatus = ['Order Confirmed', 'In Process', 'Packed', 'Confirmed', 'Pending', 'Sourcing'].includes(rawStatus)
    ? 'In Process'
    : rawStatus;

  const customerName = currentOrder.shippingAddress?.fullName || currentOrder.customerName || 'Customer';
  const customerAddress = currentOrder.shippingAddress 
    ? `${currentOrder.shippingAddress.address1 || ''}${currentOrder.shippingAddress.city ? `, ${currentOrder.shippingAddress.city}` : ''}`
    : currentOrder.customerAddress || 'No Address Provided';
  
  const customerPhone = currentOrder.shippingAddress?.phone || currentOrder.customerPhone || '';
  
  const itemsSubtotal = currentOrder.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const deliveryCharges = currentOrder.shippingAmount != null ? currentOrder.shippingAmount : Math.max(0, currentOrder.totalAmount - itemsSubtotal);

  const handleReviewComplete = () => {
    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, isReviewed: true }))
    }));
  };

  return (
    <>
      <div className="grid gap-4 md:gap-6 md:grid-cols-3">
        {/* Left Column */}
        <div className="flex flex-col gap-4 md:gap-6 md:col-span-2 min-w-0">
          
          {/* Delivered / Review Banner if delivered */}
          {isDelivered && (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/30 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Star className="size-5 text-amber-600 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    {isAllReviewed ? 'Thank you for your review!' : 'How was your experience?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    {isAllReviewed 
                      ? 'Your feedback helps other buyers make informed choices.' 
                      : 'Your order is delivered! Share your feedback and rate the products.'}
                  </p>
                </div>
              </div>
              <div>
                {isAllReviewed ? (
                  <Button disabled variant="outline" className="bg-white/80 border-gray-200 text-gray-400 rounded-xl h-10 px-5 font-semibold text-xs cursor-not-allowed">
                    <CheckCircle2 className="size-4 mr-1.5 text-emerald-600" />
                    Reviewed
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowReviewModal(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-5 font-semibold text-xs shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
                  >
                    <MessageSquare className="size-4 mr-1.5" />
                    Write a Review
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Order Header Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 space-y-0">
              <div className="flex flex-col space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg md:text-xl break-all">Order #{currentOrder.orderId}</CardTitle>
                  <CopyButton text={currentOrder.orderId} className="size-6 text-muted-foreground shrink-0" />
                </div>
                <CardDescription className="text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                  <span>Placed on {formatFullDateTime(currentOrder.createdAt)}</span>
                  <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border text-xs">
                    {formatSmartTimeAgo(currentOrder.createdAt)}
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
                <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                  {displayStatus}
                </Badge>
                <InvoiceButton order={currentOrder} branding={invoiceBranding} variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
            </CardHeader>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {currentOrder.items.length} item{currentOrder.items.length === 1 ? '' : 's'} in this order.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              
              {/* --- PC VIEW (Native Shadcn Table) --- */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentOrder.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="relative size-12 rounded-md bg-muted overflow-hidden">
                            {item.image ? (
                               <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                            ) : (
                               <div className="flex h-full w-full items-center justify-center">
                                  <Package className="size-4 text-muted-foreground/50" />
                               </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">Rs. {Number(item.price || 0).toLocaleString('en-PK')}</TableCell>
                        <TableCell className="text-right font-medium">Rs. {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-PK')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --- MOBILE VIEW (Flex Layout) --- */}
              <div className="flex flex-col divide-y sm:hidden">
                {currentOrder.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-3 py-4 px-4 min-w-0">
                    <div className="flex gap-4 min-w-0">
                      <div className="relative size-16 rounded-md border bg-muted overflow-hidden shrink-0">
                        {item.image ? (
                           <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                        ) : (
                           <div className="flex h-full w-full items-center justify-center">
                              <Package className="size-5 text-muted-foreground/50" />
                           </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="font-medium text-sm line-clamp-2">{item.name}</span>
                        <div className="text-xs text-muted-foreground mt-1">
                          Qty: {item.quantity} × Rs. {Number(item.price || 0).toLocaleString('en-PK')}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium pt-2 border-t mt-1">
                      <span className="text-xs text-muted-foreground uppercase">Total</span>
                      <span>Rs. {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-PK')}</span>
                    </div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 md:gap-6 md:col-span-1">
          
          {/* Courier & Tracking Card */}
          <Card className="border-sky-200 dark:border-sky-900 bg-gradient-to-b from-sky-50/50 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="size-4 text-sky-600" />
                Shipment Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const effectiveTracking = currentOrder.nocThirdPartyNo || currentOrder.nocParcelNo || currentOrder.trackingNumber;
                if (!effectiveTracking) {
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Order is currently being prepared. Live tracking activates as soon as your parcel is dispatched.
                      </p>
                      <Button
                        disabled
                        variant="outline"
                        className="w-full text-xs h-10 rounded-xl bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed font-medium"
                      >
                        <Truck className="size-4 mr-2" />
                        Track Package (Preparing)
                      </Button>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Courier:</span>
                      <span className="font-semibold text-foreground">{currentOrder.courierName || 'NOC Express'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tracking #:</span>
                      <span className="font-mono font-bold text-sky-700">{effectiveTracking}</span>
                    </div>
                    {currentOrder.nocStatus ? (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Latest Update:</span>
                        <span className="font-semibold text-foreground">
                          {currentOrder.nocStatus}
                          {currentOrder.nocStatusTime && (
                            <span className="font-normal text-muted-foreground ml-1">
                              ({formatSmartTimeAgo(currentOrder.nocStatusTime)})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : null}
                    <Button
                      onClick={() => setShowTrackingModal(true)}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl h-10 shadow-sm cursor-pointer"
                    >
                      <Truck className="size-4 mr-2" />
                      Track Package
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs. {itemsSubtotal.toLocaleString('en-PK')}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span>{deliveryCharges === 0 ? 'Free' : `Rs. ${deliveryCharges.toLocaleString('en-PK')}`}</span>
              </div>

              {currentOrder.discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-Rs. {currentOrder.discountAmount.toLocaleString('en-PK')}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span className="text-lg">Rs. {currentOrder.totalAmount.toLocaleString('en-PK')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Card */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="font-medium">{customerName}</div>
                <div className="text-muted-foreground mt-1 leading-relaxed break-words">{customerAddress}</div>
                {customerPhone && <div className="text-muted-foreground mt-1">{customerPhone}</div>}
              </div>
            </CardContent>
            <Separator />
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-sm">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {currentOrder.paymentMethod || 'Cash on Delivery'}
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>

      <NocTrackingModal
        open={showTrackingModal}
        onOpenChange={setShowTrackingModal}
        trackingNumber={currentOrder.nocThirdPartyNo || currentOrder.nocParcelNo || currentOrder.trackingNumber}
        orderId={currentOrder.orderId}
        courierName={currentOrder.courierName || 'NOC Express'}
        nocLabelUrl={currentOrder.nocLabelUrl}
      />

      {isDelivered && (
        <ReviewModal
          isOpen={showReviewModal}
          onOpenChange={setShowReviewModal}
          order={currentOrder}
          onComplete={handleReviewComplete}
          onAction={handleReviewAction}
        />
      )}
    </>
  );
}

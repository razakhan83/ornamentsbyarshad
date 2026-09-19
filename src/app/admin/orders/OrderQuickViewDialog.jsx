'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Camera, Eye, MapPin, Package, Phone, User, ExternalLink, Check, Copy, Truck, Globe, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { normalizeOrderStatus, getOrderOriginInfo } from '@/lib/order-status';
import { formatSmartTimeAgo, formatFullDateTime } from '@/lib/timeAgo';

export function getStatusBadgeClass(status, isDraft = false) {
  if (isDraft) {
    return 'border-slate-300 bg-slate-50 text-slate-700';
  }
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === 'order confirmed') {
    return 'border-sky-200 bg-sky-100 text-sky-800';
  }

  if (normalizedStatus === 'delivered') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  if (
    normalizedStatus.includes('issue') ||
    normalizedStatus.includes('return')
  ) {
    return 'border-red-200 bg-red-100 text-red-800';
  }

  if (
    normalizedStatus === 'in process' ||
    normalizedStatus === 'packed' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'out for delivery'
  ) {
    return 'border-amber-200 bg-amber-100 text-amber-800';
  }

  return 'border-slate-200 bg-slate-100 text-slate-800';
}

const formatPrice = (price) => `PKR ${Number(price || 0).toLocaleString('en-PK')}`;
const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

function getStatusLabel(order) {
  return order?.isDraft ? 'Draft' : normalizeOrderStatus(order?.status);
}

function getTotalUnits(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Number(item?.quantity || 0),
    0
  );
}

function getCodAmount(order) {
  if (order?.manualCodAmount != null && order.manualCodAmount !== '') {
    return Number(order.manualCodAmount);
  }
  return Number(order?.totalAmount || 0);
}

export default function OrderQuickViewDialog({
  order,
  triggerClassName = '',
  triggerVariant = 'secondary',
  triggerSize = 'sm',
  triggerLabel = 'View',
}) {
  const cardRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const items = Array.isArray(order?.items) ? order.items : [];
  const totalUnits = getTotalUnits(items);
  const statusLabel = getStatusLabel(order);
  const statusClass = getStatusBadgeClass(statusLabel, order?.isDraft);
  const codAmount = getCodAmount(order);
  const itemsTotal = items.reduce(
    (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 1),
    0
  );

  const displayTracking = (
    order?.nocThirdPartyNo && String(order.nocThirdPartyNo).trim() !== '' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'N/A' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'NA'
      ? String(order.nocThirdPartyNo).trim()
      : (order?.nocParcelNo || order?.trackingNumber || '')
  )?.trim();

  const handleCopyTracking = (e) => {
    e.stopPropagation();
    if (!displayTracking) return;
    navigator.clipboard.writeText(displayTracking);
    setCopied(true);
    toast.success('Tracking number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAsImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'none',
        },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `order-${order?.orderId || 'detail'}.png`;
      link.click();
      toast.success('Image saved successfully');
    } catch (err) {
      console.error('Failed to save image:', err);
      toast.error('Failed to capture image');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: triggerVariant, size: triggerSize }), triggerClassName)}
      >
        <Eye data-icon="inline-start" />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-xl overflow-hidden p-0 sm:max-w-2xl rounded-sm" showCloseButton>
        {/* Header Actions */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pl-5 pr-12 py-3.5">
          <DialogTitle className="text-sm font-bold text-foreground">
            Order Quick View
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
              disabled={isSaving}
              onClick={handleSaveAsImage}
            >
              {isSaving ? <Spinner className="size-3" /> : <Camera className="size-3" />}
              <span>{isSaving ? 'Saving...' : 'Save Image'}</span>
            </Button>
            <Link
              href={`/admin/orders/${order?._id}`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-8 text-xs font-semibold gap-1')}
            >
              <span>Full Details</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="max-h-[calc(92vh-64px)] overflow-y-auto">
          {/* Capture Area */}
          <div ref={cardRef} className="bg-background p-6 sm:p-7 text-foreground space-y-6">
            {/* Header: Order ID, Date, Status */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const origin = getOrderOriginInfo(order);
                    return origin.isAdmin ? (
                      <UserCog className="size-4 text-foreground shrink-0 select-none" title={origin.tooltip} />
                    ) : (
                      <Globe className="size-4 text-foreground shrink-0 select-none" title={origin.tooltip} />
                    );
                  })()}
                  <h2 className="text-xl font-bold tracking-tight text-foreground font-mono">{order?.orderId}</h2>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5" title={formatFullDateTime(order?.createdAt)}>
                  <span>{formatFullDateTime(order?.createdAt)}</span>
                  <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                    {formatSmartTimeAgo(order?.createdAt)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full border px-3 py-0.5 text-xs font-bold', statusClass)}>
                  {statusLabel}
                </span>
                <span className="rounded-full border px-3 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                  {order?.paymentStatus || 'COD'}
                </span>
              </div>
            </div>

            {/* ── Customer & Delivery Information (Clean 2-Col Grid) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Name</span>
                <p className="font-bold text-foreground">{order?.customerName || '—'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</span>
                <p className="font-mono font-semibold text-foreground">{order?.customerPhone || '—'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</span>
                <p className="font-bold text-foreground">{order?.customerCity || '—'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Address</span>
                <p className="text-foreground text-xs leading-relaxed">
                  {order?.customerAddress || '—'}
                  {order?.landmark ? <span className="text-muted-foreground ml-1">({order.landmark})</span> : null}
                </p>
              </div>
            </div>

            {/* ── Notes if present ── */}
            {order?.notes && (
              <div className="text-xs text-foreground bg-muted/30 border-l-2 border-border pl-3 py-1.5 italic">
                &quot;{order.notes}&quot;
              </div>
            )}

            {/* ── Product list ── */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Order Items ({items.length})
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">Amount</span>
              </div>
              
              {items.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">No items in this order.</div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, index) => {
                    const lineTotal = Number(item?.price || 0) * Number(item?.quantity || 1);
                    return (
                      <div
                        key={`${item?.productId || item?.name || 'item'}-${index}`}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        {/* Image + Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
                            {item?.image ? (
                              <Image
                                src={item.image}
                                alt={item.name || 'Product'}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-[9px] font-bold uppercase text-muted-foreground">
                                N/A
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item?.name || 'Unnamed product'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item?.price || 0)} × {item?.quantity || 1}
                            </p>
                          </div>
                        </div>

                        {/* Line total */}
                        <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                          {formatPrice(lineTotal)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals Summary */}
              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium text-foreground">{formatPrice(itemsTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Delivery Charges:</span>
                  <span className="font-medium text-foreground">
                    {order?.shippingAmount != null ? formatPrice(order.shippingAmount) : 'PKR 0'}
                  </span>
                </div>
                {order?.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span className="font-medium text-foreground">-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                
                {/* Total Amount Row */}
                <div className="flex items-center justify-between border-t border-border pt-2.5 mt-2">
                  <span className="text-sm font-bold text-foreground">Total Payable</span>
                  <span className="text-lg font-black text-foreground font-mono">{formatPrice(order?.totalAmount || codAmount)}</span>
                </div>

                {/* Courier & Tracking Footer Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap font-medium">
                    <span>COD: <strong className="text-foreground font-bold">{formatPrice(codAmount)}</strong></span>
                    <span>•</span>
                    <span>{Number(order?.weight || 2)} kg</span>
                    <span>•</span>
                    <span>{totalUnits} unit{totalUnits === 1 ? '' : 's'}</span>
                  </div>

                  {displayTracking && (
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Truck className="size-3.5 text-muted-foreground" />
                      <span>Tracking:</span>
                      <button
                        type="button"
                        onClick={handleCopyTracking}
                        className="font-mono font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="Click to copy"
                      >
                        {displayTracking}
                        {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
                      </button>
                      {order?.courierName && (
                        <span className="text-muted-foreground">({order.courierName})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

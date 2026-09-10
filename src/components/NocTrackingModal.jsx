'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CopyButton from '@/components/CopyButton';
import { RotateCw, Package, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { formatSmartTimeAgo, formatFullDateTime } from '@/lib/timeAgo';
import { mapCourierEventForCustomer } from '@/lib/order-status';

function formatEventTitle(status) {
  if (!status) return 'Status Update';
  return String(status).trim();
}

function formatEventDateTime(rawDate) {
  if (!rawDate) return '';
  return formatFullDateTime(rawDate);
}

function cleanRemarks(remarks) {
  if (!remarks) return null;
  const cleaned = String(remarks).trim();
  if (
    cleaned === '' ||
    cleaned === '---' ||
    cleaned === '------' ||
    cleaned.toLowerCase() === 'null' ||
    cleaned.toLowerCase() === 'undefined' ||
    cleaned.toLowerCase() === 'n/a' ||
    cleaned.toLowerCase() === 'booking' ||
    cleaned.toLowerCase() === 'booked'
  ) {
    return null;
  }
  return cleaned;
}

export default function NocTrackingModal({
  open,
  onOpenChange,
  trackingNumber,
  orderId,
  courierName,
  nocLabelUrl,
  isAdmin = false,
  initialMode = 'admin',
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(initialMode);

  useEffect(() => {
    if (open) {
      setViewMode(isAdmin ? initialMode : 'customer');
    }
  }, [open, isAdmin, initialMode]);

  const fetchTracking = useCallback(async () => {
    if (!trackingNumber && !orderId) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (trackingNumber) params.set('trackingNumber', trackingNumber);
      if (orderId) params.set('orderId', orderId);

      const res = await fetch(`/api/courier/track?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setData(result);
        if (result.fetchError) {
          setError(result.fetchError);
        }
      } else {
        setError(result.error || 'Failed to fetch tracking data');
      }
    } catch (err) {
      console.error('Tracking fetch error:', err);
      setError('Unable to retrieve tracking updates.');
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, orderId]);

  useEffect(() => {
    if (open) {
      fetchTracking();
    }
  }, [open, fetchTracking]);

  // Determine effective courier and tracking number according to rules
  const effectiveCourier = data?.courierName || courierName || 'NOC';
  const effectiveTrackingNo = data?.trackingNumber || trackingNumber || '';
  const events = Array.isArray(data?.events) ? data.events : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-[620px] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl antialiased">
        {/* Header - Spacious and Grand on PC, adaptive on Mobile */}
        <div className="px-5 py-5 sm:px-8 sm:pt-7 sm:pb-5 border-b border-border/70 bg-card pr-12 sm:pr-14">
          <DialogHeader className="p-0 text-left space-y-2.5 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground">
                  Shipment Tracking
                </DialogTitle>
                <button
                  type="button"
                  onClick={fetchTracking}
                  disabled={loading}
                  title="Refresh tracking status"
                  className="size-7 sm:size-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`size-3.5 sm:size-4.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh</span>
                </button>
              </div>

              {/* Admin vs Customer View Toggle (Only for Admin) */}
              {isAdmin && (
                <div className="inline-flex items-center rounded-lg bg-muted p-1 text-xs border border-border">
                  <button
                    type="button"
                    onClick={() => setViewMode('admin')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      viewMode === 'admin'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Raw NOC (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('customer')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      viewMode === 'customer'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Customer View
                  </button>
                </div>
              )}
            </div>

            {/* Clean, Spacious Metadata Row on PC */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm pt-0.5 sm:pt-1">
              {orderId ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Order:</span>
                  <span className="font-semibold text-foreground tracking-tight sm:text-[14px]">#{orderId}</span>
                </div>
              ) : null}

              {orderId ? <span className="text-muted-foreground/30">•</span> : null}

              {/* Courier Partner Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Courier:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-muted text-foreground border border-border/70">
                  {effectiveCourier}
                </span>
              </div>

              {effectiveTrackingNo ? (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Tracking #:</span>
                    <div className="inline-flex items-center gap-2 bg-muted/60 hover:bg-muted/80 transition-colors px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md border border-border/70 font-mono font-bold text-foreground">
                      <span className="select-all text-xs sm:text-sm tracking-tight">{effectiveTrackingNo}</span>
                      <CopyButton
                        text={effectiveTrackingNo}
                        className="size-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted p-0.5 inline-flex items-center justify-center cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        {/* Content Body / Timeline - Roomy, Large, and Easy to Read on PC */}
        <div className="px-5 py-5 sm:px-8 sm:py-7 max-h-[64vh] overflow-y-auto">
          {loading ? (
            /* Modern Timeline Skeleton Loader */
            <div className="relative pl-7 sm:pl-8 py-2 flex flex-col gap-6 sm:gap-7 before:absolute before:left-[8px] sm:before:left-[10px] before:top-3 before:bottom-3 before:w-px before:bg-border/60">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative flex items-start gap-3 sm:gap-4">
                  {/* Node Skeleton Dot */}
                  <div className="absolute -left-7 sm:-left-8 top-1 size-4 rounded-full border-2 border-muted bg-muted animate-pulse" />
                  {/* Content Skeleton */}
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
                      <Skeleton className={`h-4.5 ${i === 1 ? 'w-36' : i === 2 ? 'w-48' : i === 3 ? 'w-32' : 'w-40'} rounded-md`} />
                      <Skeleton className="h-4 w-28 sm:w-36 rounded-md" />
                    </div>
                    {i === 1 && <Skeleton className="h-3.5 w-44 rounded-md opacity-60" />}
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center text-center">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <Package className="size-7" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {error || 'No tracking history yet'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Parcel is booked with {effectiveCourier}. Checkpoints will update automatically once scanned at the courier hub.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTracking}
                className="mt-4 h-9 px-4 text-xs sm:text-sm font-medium rounded-lg"
              >
                Check again
              </Button>
            </div>
          ) : (
            <div className="relative pl-7 sm:pl-8 py-2 flex flex-col gap-6 sm:gap-7 before:absolute before:left-[8px] sm:before:left-[10px] before:top-3 before:bottom-3 before:w-px before:bg-border/80">
              {events.map((event, idx) => {
                const isLatest = idx === 0;
                
                // Admin gets exact raw NOC status & remarks; Customer gets clear friendly title & description
                let title = '';
                let subtitle = '';

                if (viewMode === 'admin') {
                  title = event.status || 'Status Update';
                  subtitle = cleanRemarks(event.remarks);
                } else {
                  const friendly = mapCourierEventForCustomer(event.status, event.remarks);
                  title = friendly.title;
                  subtitle = friendly.description;
                }

                const displayDate = formatEventDateTime(event.dateTime);
                const isDeliveredStep = title.toLowerCase().includes('delivered');

                return (
                  <div key={idx} className="relative flex items-start gap-3 sm:gap-4">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-7 sm:-left-8 top-1 size-4 sm:size-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLatest
                          ? isDeliveredStep
                            ? 'border-emerald-600 bg-emerald-600 ring-4 ring-emerald-500/20 text-white'
                            : 'border-sky-600 bg-sky-600 ring-4 ring-sky-500/20 text-white'
                          : 'border-muted-foreground/30 bg-card'
                      }`}
                    >
                      {isLatest ? (
                        <div className="size-1.5 rounded-full bg-white" />
                      ) : (
                        <div className="size-1 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>

                    {/* Event Detail */}
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                        <span
                          className={`text-[13px] sm:text-[15px] leading-snug ${
                            isLatest ? 'text-foreground font-bold' : 'text-muted-foreground/90 font-medium'
                          }`}
                        >
                          {title}
                        </span>
                        {displayDate ? (
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                            <time className="text-[11px] sm:text-[13px] tabular-nums text-muted-foreground font-medium whitespace-nowrap">
                              {displayDate}
                            </time>
                            {event.dateTime && (
                              <span className="text-[10px] sm:text-[11px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                                {formatSmartTimeAgo(event.dateTime)}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {subtitle ? (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5 flex items-center gap-1.5">
                          <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                          <span>{subtitle}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clean Spacious Footer */}
        <div className="px-5 py-4 sm:px-8 sm:py-4.5 bg-muted/20 border-t border-border/70 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 text-xs sm:text-sm font-medium rounded-lg shadow-2xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

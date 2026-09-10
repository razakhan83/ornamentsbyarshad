import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import styles from '@/app/(store)/(checkout-shell)/checkout/CheckoutClient.module.css';

/**
 * Clean, neutral, high-performance checkout skeleton mirroring the exact Shopify-style layout
 */
export default function CheckoutPageSkeleton() {
  return (
    <>
      {/* ── TOP NAV BAR SKELETON ── */}
      <div className="sticky top-0 z-50 w-full bg-background border-b border-border/40 px-4 py-4 lg:px-8 flex items-center">
        <div className="w-full max-w-[1130px] mx-auto relative flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-4 w-10 rounded hidden sm:inline-block" />
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>

          <div className="z-10 flex items-center">
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
      </div>

      {/* ── MOBILE ORDER SUMMARY ACCORDION TRIGGER ── */}
      <div className={styles.mobileOrderSummary}>
        <div className={styles.mobileOrderSummaryTrigger}>
          <div className={styles.mobileOrderSummaryTriggerLeft}>
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3.5 w-36 rounded" />
          </div>
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </div>

      <div className={styles.checkoutShell}>
        {/* ── LEFT PANEL (Forms) ── */}
        <div className={styles.leftPanel}>
          <div className={styles.leftPanelInner}>
            
            {/* Contact Section */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionTitleRow}>
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-12 rounded" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className={styles.checkboxRow}>
                  <Skeleton className="size-4 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-60 rounded" />
                </div>
              </div>
            </div>

            {/* Delivery Section */}
            <div className={styles.sectionBlock}>
              <div className="mb-2">
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-12 rounded-xl" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className={styles.checkboxRow}>
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-3.5 w-52 rounded" />
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div className={styles.sectionBlock}>
              <div className="mb-2">
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
              <div className="rounded-xl border border-border/60 p-4 flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            </div>

            {/* Payment Section */}
            <div className={styles.sectionBlock}>
              <div className="space-y-1 mb-3">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-3 w-56 rounded" />
              </div>
              
              <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/60">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-36 rounded" />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-44 rounded" />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Order Summary (Bottom) */}
            <div className="md:hidden mt-6 mb-3 border-t border-border/60 pt-6 space-y-3">
              <Skeleton className="h-5 w-28 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>

            {/* Desktop CTA */}
            <Skeleton className="hidden md:flex h-13 w-full rounded-xl mb-4" />

            {/* Trust links */}
            <div className={styles.trustLinks}>
               <Skeleton className="h-3 w-20 rounded" />
               <Skeleton className="h-3 w-16 rounded" />
               <Skeleton className="h-3 w-24 rounded" />
               <Skeleton className="h-3 w-28 rounded" />
               <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (Desktop Order Summary) ── */}
        <div className={styles.rightPanel}>
          <div className={styles.rightPanelInner}>
            {/* Product list */}
            <div className={styles.summaryProductList}>
              {[1, 2].map((i) => (
                <div key={i} className={styles.summaryProduct}>
                  <div className={styles.summaryProductThumbWrapper}>
                    <Skeleton className={styles.summaryProductThumb} />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded ml-auto" />
                </div>
              ))}
            </div>

            <div className={styles.summaryDivider} />

            {/* Discount row */}
            <div className={styles.discountRow}>
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md shrink-0" />
            </div>

            <div className={styles.summaryDivider} />

            {/* Totals */}
            <div className={styles.totalsGrid}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.totalRow}>
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3.5 w-16 rounded" />
                </div>
              ))}
            </div>

            <div className={styles.summaryDivider} />

            {/* Grand total */}
            <div className={styles.grandTotalRow}>
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-7 w-28 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY BAR SKELETON ── */}
      <div className={styles.mobileCheckoutBar}>
        <div className={styles.mobileCheckoutInner}>
          <div className={styles.mobileAmount}>
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl shrink-0" />
        </div>
      </div>
    </>
  );
}

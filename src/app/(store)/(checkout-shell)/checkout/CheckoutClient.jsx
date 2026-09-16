'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Loader2,
  Lock,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Tag,
  Truck,
  Banknote,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { getLastOrderDetailsAction, submitOrderAction, validateCouponAction } from '@/app/actions';
import { getAvailableStock, isProductOutOfStock } from '@/lib/productCommerce';
import { createWhatsAppUrl } from '@/lib/whatsapp';

import AuthModal from '@/components/AuthModal';
import OrderSuccessModal from '@/components/OrderSuccessModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StoreLogo from '@/components/StoreLogo';
import CheckoutPageSkeleton from '@/components/CheckoutPageSkeleton';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCartActions, useCartItems } from '@/context/CartContext';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { trackInitiateCheckoutEvent, trackPurchaseEvent } from '@/lib/clientTracking';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { getPrimaryProductImage } from '@/lib/productImages';
import { getProductCategoryBgColor } from '@/lib/productCategories';
import { cn } from '@/lib/utils';
import { calculateCheckoutPricing } from '@/lib/checkoutPricing';
import styles from './CheckoutClient.module.css';

const formatPrice = (raw) => Number(raw || 0);
const formatPriceLabel = (raw) => `Rs.\u00A0${formatPrice(raw).toLocaleString('en-PK')}`;
const PRIORITY_CITY_KEYS = ['karachi', 'lahore', 'islamabad', 'hyderabad'];
const INITIAL_CITY_COUNT = PRIORITY_CITY_KEYS.length;
const SEARCH_RESULTS_LIMIT = 24;
const CHECKOUT_PROFILE_STORAGE_KEY = 'ornaments_checkout_profile_v1';
const CHECKOUT_SUCCESS_STORAGE_KEY = 'ornaments_checkout_success_v1';

function createIdempotencyKey() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCitySearchValue(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function FloatingLabelInput({ label, id, value, className, wrapperClassName, isValid, ...props }) {
  const hasValue = Boolean(value);
  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <Input
        id={id}
        value={value}
        {...props}
        className={cn(
          'h-12 text-[15px] md:text-sm rounded-xl transition-all duration-150',
          className,
          hasValue ? 'pt-5 pb-1' : '',
          isValid ? 'border-emerald-500/80 pr-10 focus-visible:border-emerald-600 focus-visible:ring-emerald-500/15' : ''
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          'absolute left-3.5 top-1.5 text-[10.5px] font-semibold transition-all duration-200 pointer-events-none select-none tracking-tight text-primary',
          hasValue ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        )}
      >
        {label}
      </label>
      {isValid ? (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none animate-in fade-in zoom-in-75 duration-200">
          <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="size-3 text-emerald-600 stroke-[2.5]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FloatingLabelTextarea({ label, id, value, className, wrapperClassName, rows = 2, isValid, ...props }) {
  const hasValue = Boolean(value);
  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        {...props}
        className={cn(
          'min-h-[4.5rem] text-[15px] md:text-sm resize-none rounded-xl shadow-none transition-all duration-150',
          className,
          hasValue ? 'pt-5 pb-1.5' : 'pt-3.5',
          isValid ? 'border-emerald-500/80 pr-10 focus-visible:border-emerald-600 focus-visible:ring-emerald-500/15' : ''
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          'absolute left-3.5 top-1.5 text-[10.5px] font-semibold transition-all duration-200 pointer-events-none select-none tracking-tight text-primary',
          hasValue ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        )}
      >
        {label}
      </label>
      {isValid ? (
        <div className="absolute right-3.5 top-4 flex items-center pointer-events-none animate-in fade-in zoom-in-75 duration-200">
          <div className="size-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="size-3 text-emerald-600 stroke-[2.5]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCityLabel(city) {
  return city
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (!word) return word;
      if (word.startsWith('(') || word.includes('.')) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const CITY_OPTIONS = Array.from(new Map(PAKISTAN_CITIES.map((city) => [city.toLowerCase(), city])).values())
  .map((city) => ({
    value: formatCityLabel(city),
    label: formatCityLabel(city),
    sortKey: normalizeCitySearchValue(city),
  }))
  .sort((left, right) => {
    const leftPriority = PRIORITY_CITY_KEYS.indexOf(left.sortKey);
    const rightPriority = PRIORITY_CITY_KEYS.indexOf(right.sortKey);
    const normalizedLeftPriority = leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
    const normalizedRightPriority = rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;

    if (normalizedLeftPriority !== normalizedRightPriority) {
      return normalizedLeftPriority - normalizedRightPriority;
    }

    return left.label.localeCompare(right.label, 'en-PK');
  });

function readCachedCheckoutProfile() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CHECKOUT_PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Failed to read cached checkout profile', error);
    return null;
  }
}

async function safeReadJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response', error);
    return null;
  }
}

function mergeCheckoutProfile(previous, nextProfile = {}, options = {}) {
  const { overwriteEmail = false } = options;

  return {
    ...previous,
    fullName: previous.fullName || nextProfile.name || nextProfile.fullName || '',
    phone: previous.phone || nextProfile.phone || '',
    email: overwriteEmail
      ? nextProfile.email || previous.email || ''
      : previous.email || nextProfile.email || '',
    city: previous.city || nextProfile.city || '',
    address: previous.address || nextProfile.address || nextProfile.addressOnly || '',
    landmark: previous.landmark || nextProfile.landmark || '',
  };
}

function persistGuestOrder(order) {
  if (typeof window === 'undefined' || !order?.orderId) return;

  try {
    const existingGuestOrders = JSON.parse(window.localStorage.getItem('guest_orders') || '[]');
    const newGuestOrder = {
      orderId: order.orderId,
      secureToken: order.secureToken || '',
      items: order.items || [],
      timestamp: Date.now(),
    };
    const updated = [newGuestOrder, ...existingGuestOrders.filter((o) => o.orderId !== order.orderId)].slice(0, 20);
    window.localStorage.setItem('guest_orders', JSON.stringify(updated));
  } catch (guestErr) {
    console.error('Failed to store guest order in localStorage', guestErr);
  }
}

function clearStoredSuccessfulOrder() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(CHECKOUT_SUCCESS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear checkout success state', error);
  }
}

// ─── Order Summary Panel (shared by mobile accordion + desktop sidebar) ────────
function OrderSummaryContent({
  cart,
  pricing,
  appliedCoupon,
  couponCodeInput,
  setCouponCodeInput,
  couponError,
  setCouponError,
  couponLoading,
  handleApplyCoupon,
  handleRemoveCoupon,
  relatedProducts = [],
  addToCart,
  handleRequestRemove,
  handleQuantityDecrease,
  handleQuantityIncrease,
  relatedOffset,
  isRefreshingRelated,
  handleRefreshRelated,
}) {
  const { subtotal, shipping, total, isFreeShipping, discountAmount, freeShippingThreshold } = pricing;
  const amountUntilFreeShipping =
    !isFreeShipping && freeShippingThreshold > 0
      ? Math.max(0, freeShippingThreshold - subtotal)
      : 0;

  const availableRelated = relatedProducts
    ?.filter((p) => !cart.some((item) => String(item.id || item._id) === String(p.id || p._id)));

  const safeOffset = (relatedOffset || 0) % Math.max(1, availableRelated?.length || 1);
  let visibleRelated = availableRelated?.slice(safeOffset, safeOffset + 3) || [];
  
  if (visibleRelated.length < 3 && availableRelated?.length >= 3) {
    visibleRelated = [
      ...visibleRelated,
      ...availableRelated.slice(0, 3 - visibleRelated.length)
    ];
  }

  return (
    <>
      {/* Product list */}
      <div className="flex flex-col divide-y divide-border/50 mb-4">
        {cart.map((item, index) => {
          const itemPrice = item.Price || item.price;
          const lineTotal = formatPrice(itemPrice) * item.quantity;
          const imgUrl = getPrimaryProductImage(item)?.url;

          return (
            <div key={`${item.id}-${index}`} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-1">
              {/* Product Thumbnail */}
              <div 
                className="relative size-16 shrink-0 rounded-xl overflow-hidden border border-border/70 shadow-2xs flex items-center justify-center"
                style={{ backgroundColor: getProductCategoryBgColor(item) }}
              >
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={item.Name || item.name}
                    fill
                    className="object-cover p-1"
                    {...getBlurPlaceholderProps(getPrimaryProductImage(item).blurDataURL)}
                  />
                ) : null}
              </div>

              {/* Product Info & Actions */}
              <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug">
                      {item.Name || item.name}
                    </span>
                    <span className="text-[13px] font-bold text-foreground shrink-0 tabular-nums">
                      {formatPriceLabel(lineTotal)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="text-[12px] text-muted-foreground font-medium">
                      {formatPriceLabel(itemPrice)} each
                    </p>
                    {item.packLabel ? (
                      <span className="inline-block text-[11px] font-medium text-muted-foreground bg-muted border border-border/50 px-1.5 py-0.5 rounded">
                        {item.packLabel}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  {/* Stepper Quantity Controls */}
                  <div className="inline-flex items-center h-8 sm:h-7 rounded-lg border border-border/80 bg-background shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleQuantityDecrease ? handleQuantityDecrease(item) : null}
                      className="relative flex items-center justify-center size-8 sm:size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-l-lg transition-colors active:scale-90 after:absolute after:-inset-1 after:content-['']"
                      aria-label="Decrease quantity"
                      title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                    >
                      {item.quantity === 1 ? <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" /> : <Minus className="size-3" />}
                    </button>
                    <span className="inline-flex items-center justify-center px-2 text-[12px] font-bold tabular-nums min-w-[24px] text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityIncrease ? handleQuantityIncrease(item) : null}
                      className="relative flex items-center justify-center size-8 sm:size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-r-lg transition-colors active:scale-90 after:absolute after:-inset-1 after:content-['']"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRequestRemove ? handleRequestRemove(item) : null}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/40 px-2 py-1 rounded-md transition-colors active:scale-95 cursor-pointer"
                    aria-label="Remove item"
                    title="Remove item"
                  >
                    <Trash2 className="size-3.5 text-red-500 dark:text-red-400" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.summaryDivider} />

      {/* Discount code */}
      <div className="mb-3">
        {appliedCoupon ? (
          <div className={styles.couponApplied}>
            <div className={styles.couponAppliedLeft}>
              <Tag className="size-3.5 text-success" />
              <span className={styles.couponCode}>{appliedCoupon.code}</span>
              <span className="text-success text-xs font-semibold">Applied</span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs text-destructive hover:underline font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className={styles.discountRow}>
            <Input
              id="coupon-code"
              placeholder="Discount code"
              value={couponCodeInput}
              onChange={(e) => {
                setCouponCodeInput(e.target.value.toUpperCase());
                setCouponError('');
              }}
              className={cn('flex-1', couponError && 'border-destructive')}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!couponCodeInput.trim() || couponLoading}
              className="shrink-0"
            >
              {couponLoading ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
            </Button>
          </form>
        )}
        {couponError && <p className="mt-1 text-xs text-destructive">{couponError}</p>}
      </div>

      <div className={styles.summaryDivider} />

      {/* Totals */}
      <div className={styles.totalsGrid}>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Subtotal</span>
          <span className={styles.totalValue}>Rs.&nbsp;{subtotal.toLocaleString('en-PK')}</span>
        </div>
        {discountAmount > 0 && (
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Discount ({appliedCoupon?.code})</span>
            <span className={styles.totalValueDiscount}>−Rs.&nbsp;{discountAmount.toLocaleString('en-PK')}</span>
          </div>
        )}
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Shipping</span>
          <span className={isFreeShipping ? styles.totalValueFree : styles.totalValue}>
            {isFreeShipping ? 'Free' : `Rs.\u00A0${shipping.toLocaleString('en-PK')}`}
          </span>
        </div>
        {amountUntilFreeShipping > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Add Rs.&nbsp;{amountUntilFreeShipping.toLocaleString('en-PK')} more for free delivery.
          </p>
        ) : null}
      </div>

      <div className={styles.summaryDivider} />

      {/* Grand total */}
      <div className={styles.grandTotalRow}>
        <span className={styles.grandTotalLabel}>Total</span>
        <span>
          <span className={styles.grandTotalCurrency}>PKR</span>
          <span className={styles.grandTotalValue}>Rs.&nbsp;{total.toLocaleString('en-PK')}</span>
        </span>
      </div>
    </>
  );
}

export default function CheckoutClient({ settings, relatedProducts = [] }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cart, isInitialized } = useCartItems();
  const { clearCart, addToCart, removeFromCart, updateQuantity } = useCartActions();
  const [itemToRemove, setItemToRemove] = useState(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const handleRequestRemove = (item) => {
    setItemToRemove(item);
    setIsRemoveModalOpen(true);
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove);
      toast.success(`${itemToRemove.Name || itemToRemove.name || 'Item'} removed from order`);
    }
    setIsRemoveModalOpen(false);
    setItemToRemove(null);
  };

  const handleQuantityDecrease = (item) => {
    if (item.quantity <= 1) {
      handleRequestRemove(item);
    } else {
      updateQuantity(item, item.quantity - 1);
    }
  };

  const handleQuantityIncrease = (item) => {
    updateQuantity(item, item.quantity + 1);
  };

  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [hasHydratedCachedProfile, setHasHydratedCachedProfile] = useState(false);
  const [hasCachedProfile, setHasCachedProfile] = useState(false);
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);
  const [saveInfo, setSaveInfo] = useState(true);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    landmark: '',
    instructions: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [orderState, setOrderState] = useState({ orderId: '', whatsappUrl: '' });
  const [copied, setCopied] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasTrackedCheckoutView, setHasTrackedCheckoutView] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const submissionLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  useEffect(() => {
    clearStoredSuccessfulOrder();
  }, []);

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [relatedOffset, setRelatedOffset] = useState(0);
  const [isRefreshingRelated, setIsRefreshingRelated] = useState(false);

  const handleRefreshRelated = () => {
    setIsRefreshingRelated(true);
    setTimeout(() => {
      setRelatedOffset((prev) => prev + 3);
      setIsRefreshingRelated(false);
    }, 400); // Small delay to show skeleton
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__addToCart = addToCart;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__addToCart;
      }
    };
  }, [addToCart]);

  useEffect(() => {
    if (hasHydratedCachedProfile) return;

    const cachedProfile = readCachedCheckoutProfile();
    if (cachedProfile) {
      setFormData((prev) => mergeCheckoutProfile(prev, cachedProfile));
      setHasCachedProfile(true);
    }

    setHasHydratedCachedProfile(true);
  }, [hasHydratedCachedProfile]);

  useEffect(() => {
    let isMounted = true;

    const syncData = async () => {
      if (status !== 'authenticated' || !session?.user) return;

      const shouldShowLoader = !hasCachedProfile;
      if (shouldShowLoader) {
        setIsHydratingProfile(true);
      }

      const profileRequest = fetch('/api/user/settings', { cache: 'no-store' })
        .then(async (res) => (res.ok ? safeReadJson(res) : null))
        .then((settingsRes) => {
          if (!isMounted || !settingsRes) return;

          setFormData((prev) =>
            mergeCheckoutProfile(
              {
                ...prev,
                email: prev.email || session.user.email || '',
              },
              {
                ...settingsRes,
                name: settingsRes?.name || session.user.name || '',
                email: settingsRes?.email || session.user.email || '',
              },
              { overwriteEmail: true },
            )
          );
        });

      const lastOrderRequest = getLastOrderDetailsAction().then((lastOrder) => {
        if (!isMounted || !lastOrder) return;

        setFormData((prev) => mergeCheckoutProfile(prev, lastOrder));
      });

      try {
        await Promise.allSettled([profileRequest, lastOrderRequest]);
      } catch (error) {
        console.error('Auto-fill sync error:', error);
      } finally {
        if (isMounted) {
          setHasAutoFilled(true);
          if (shouldShowLoader) {
            setIsHydratingProfile(false);
          }
        }
      }
    };

    if (status === 'authenticated' && !hasAutoFilled) {
      syncData();
    } else if (status !== 'loading' && !hasAutoFilled) {
      setHasAutoFilled(true);
    }

    return () => {
      isMounted = false;
    };
  }, [hasAutoFilled, hasCachedProfile, session, status]);

  useEffect(() => {
    if (!hasHydratedCachedProfile || !saveInfo) return;

    try {
      window.localStorage.setItem(
        CHECKOUT_PROFILE_STORAGE_KEY,
        JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          city: formData.city,
          address: formData.address,
          landmark: formData.landmark,
        }),
      );
    } catch (error) {
      console.error('Failed to persist checkout profile', error);
    }
  }, [
    formData.address,
    formData.city,
    formData.email,
    formData.fullName,
    formData.landmark,
    formData.phone,
    hasHydratedCachedProfile,
    saveInfo,
  ]);

  const subtotal = useMemo(
    () =>
      cart.reduce((total, item) => {
        const itemPrice = formatPrice(item.Price || item.price);
        return total + itemPrice * item.quantity;
      }, 0),
    [cart]
  );

  const selectedCity =
    CITY_OPTIONS.find((city) => normalizeCitySearchValue(city.value) === normalizeCitySearchValue(formData.city)) ?? null;
  const deferredCitySearch = useDeferredValue(citySearch);
  const normalizedCitySearch = normalizeCitySearchValue(deferredCitySearch);
  const visibleCityOptions = useMemo(() => {
    if (!normalizedCitySearch) {
      return CITY_OPTIONS.filter((city) => PRIORITY_CITY_KEYS.includes(city.sortKey)).slice(0, INITIAL_CITY_COUNT);
    }

    return CITY_OPTIONS.filter((city) => city.sortKey.includes(normalizedCitySearch)).slice(0, SEARCH_RESULTS_LIMIT);
  }, [normalizedCitySearch]);

  const pricing = calculateCheckoutPricing({
    subtotal,
    city: formData.city,
    settings,
    appliedCoupon,
  });
  const { total } = pricing;
  const hasStockIssue = useMemo(
    () =>
      cart.some((item) => {
        const available = getAvailableStock(item);
        return isProductOutOfStock(item) || Number(item.quantity) > available;
      }),
    [cart]
  );

  useEffect(() => {
    if (hasTrackedCheckoutView || cart.length === 0) return;
    trackInitiateCheckoutEvent({ cart, total });
    setHasTrackedCheckoutView(true);
  }, [cart, hasTrackedCheckoutView, total]);

  // Capture abandoned cart snapshot for admin follow-up
  useEffect(() => {
    const phone = formData.phone?.trim();
    if (!phone || phone.length < 8 || !cart || cart.length === 0) return;

    const timer = setTimeout(() => {
      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name: formData.fullName,
          email: formData.email,
          city: formData.city,
          address: formData.address,
          landmark: formData.landmark,
          items: cart,
          totalAmount: pricing.total,
        }),
      }).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.fullName, formData.email, formData.city, formData.address, formData.landmark, cart, pricing.total]);

  const debounceTimersRef = useRef({});

  const isNameValid = useMemo(() => {
    const clean = formData.fullName.trim();
    return /^[a-zA-Z\s]{2,20}$/.test(clean);
  }, [formData.fullName]);

  const isPhoneValid = useMemo(() => {
    const clean = formData.phone.replace(/\s+/g, '');
    return /^03\d{9}$/.test(clean);
  }, [formData.phone]);

  const isAddressValid = useMemo(() => {
    const len = formData.address.trim().length;
    return len >= 5 && len <= 100;
  }, [formData.address]);

  const isCityValid = useMemo(() => Boolean(formData.city.trim()), [formData.city]);

  const isFormComplete = isNameValid && isPhoneValid && isAddressValid && isCityValid;

  function validateFieldOnBlurOrDebounce(fieldName, rawValue) {
    const val = (rawValue ?? formData[fieldName] ?? '').trim();
    if (!val) return; // Don't show premature errors on blank inputs until user leaves or submits

    if (fieldName === 'fullName') {
      if (/\d/.test(val)) {
        setErrors((prev) => ({ ...prev, fullName: 'Numbers are not allowed in name.' }));
      } else if (!/^[A-Za-z\s]+$/.test(val)) {
        setErrors((prev) => ({ ...prev, fullName: 'Please use letters only (A-Z).' }));
      } else if (val.length < 2) {
        setErrors((prev) => ({ ...prev, fullName: 'Name must be at least 2 characters.' }));
      } else if (val.length > 20) {
        setErrors((prev) => ({ ...prev, fullName: 'Name must not exceed 20 characters.' }));
      } else {
        setErrors((prev) => ({ ...prev, fullName: '' }));
      }
    }

    if (fieldName === 'phone') {
      const clean = val.replace(/\s+/g, '');
      if (!clean.startsWith('03')) {
        setErrors((prev) => ({ ...prev, phone: 'Phone number must start with 03 (e.g. 03001234567).' }));
      } else if (clean.length !== 11 || !/^\d+$/.test(clean)) {
        setErrors((prev) => ({ ...prev, phone: 'Please enter a complete 11-digit number (0300xxxxxxx).' }));
      } else {
        setErrors((prev) => ({ ...prev, phone: '' }));
      }
    }

    if (fieldName === 'address') {
      if (val.length < 5) {
        setErrors((prev) => ({ ...prev, address: 'Please enter complete address (at least 5 characters).' }));
      } else if (val.length > 100) {
        setErrors((prev) => ({ ...prev, address: 'Address must not exceed 100 characters.' }));
      } else {
        setErrors((prev) => ({ ...prev, address: '' }));
      }
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    // Instant clear if input becomes valid
    if (name === 'fullName' && /^[a-zA-Z\s]{2,20}$/.test(value.trim())) {
      setErrors((prev) => ({ ...prev, fullName: '' }));
    } else if (name === 'phone' && /^03\d{9}$/.test(value.replace(/\s+/g, ''))) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    } else if (name === 'address' && value.trim().length >= 5 && value.trim().length <= 100) {
      setErrors((prev) => ({ ...prev, address: '' }));
    }

    // Debounced caution error check after user stops typing
    if (debounceTimersRef.current[name]) {
      clearTimeout(debounceTimersRef.current[name]);
    }
    debounceTimersRef.current[name] = setTimeout(() => {
      validateFieldOnBlurOrDebounce(name, value);
    }, 900);
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    if (debounceTimersRef.current[name]) {
      clearTimeout(debounceTimersRef.current[name]);
    }
    validateFieldOnBlurOrDebounce(name, value);
  }

  function validateForm() {
    const nextErrors = {};
    const missingFields = [];

    const cleanName = formData.fullName.trim();
    if (!cleanName) {
      nextErrors.fullName = 'Full Name is required.';
      missingFields.push('Full Name');
    } else if (!/^[a-zA-Z\s]{2,20}$/.test(cleanName)) {
      nextErrors.fullName = 'Please enter a valid name (letters only, max 20 chars).';
      missingFields.push('Valid Name (Letters only, max 20 chars)');
    }
    
    const cleanPhone = formData.phone.replace(/\s+/g, '');
    if (!cleanPhone) {
      nextErrors.phone = 'Phone Number is required.';
      missingFields.push('Phone Number');
    } else if (!/^03\d{9}$/.test(cleanPhone)) {
      nextErrors.phone = 'Please enter a valid 11-digit phone number (e.g. 03001234567).';
      missingFields.push('Valid Phone (0300xxxxxxx)');
    }

    const cleanAddress = formData.address.trim();
    if (!cleanAddress) {
      nextErrors.address = 'Complete Address is required.';
      missingFields.push('Complete Address');
    } else if (cleanAddress.length < 5 || cleanAddress.length > 100) {
      nextErrors.address = 'Address must be between 5 and 100 characters.';
      missingFields.push('Complete Address (within 100 chars)');
    }

    if (!formData.city.trim()) {
      nextErrors.city = 'City is required.';
      missingFields.push('City');
    }

    setErrors(nextErrors);

    if (missingFields.length > 0) {
      toast.error('Please complete the required details:', {
        description: missingFields.join(' • '),
        duration: 4500,
      });

      // Automatically scroll smoothly to the first missing field
      const firstFieldId = nextErrors.fullName ? 'fullName' : nextErrors.phone ? 'phone' : nextErrors.address ? 'address' : 'city';
      const element = document.getElementById(firstFieldId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus?.();
      }
      return false;
    }

    return true;
  }

  async function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponCodeInput.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await validateCouponAction(
        couponCodeInput,
        subtotal,
        formData.email || session?.user?.email || '',
        formData.phone || ''
      );

      if (res.success) {
        setAppliedCoupon(res.coupon);
        setCouponCodeInput('');
      } else {
        setCouponError(res.message || 'Invalid coupon.');
      }
    } catch (error) {
      setCouponError('Error validating coupon.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
  }

  function copyToClipboard() {
    if (orderState.orderId) {
      navigator.clipboard.writeText(orderState.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleModalClose() {
    clearStoredSuccessfulOrder();
    idempotencyKeyRef.current = createIdempotencyKey();
    setOrderState({ orderId: '', whatsappUrl: '' });
    window.location.assign('/');
  }

  function handleViewOrders() {
    clearStoredSuccessfulOrder();
    idempotencyKeyRef.current = createIdempotencyKey();
    setOrderState({ orderId: '', whatsappUrl: '' });
    if (session) {
      router.push('/orders');
    } else {
      setShowAuthModal(true);
    }
  }

  function handlePlaceOrder(event) {
    event?.preventDefault?.();
    if (submissionLockRef.current || submitting || !isInitialized || !validateForm() || cart.length === 0) return;
    if (hasStockIssue) {
      setErrors((previous) => ({
        ...previous,
        submit: 'One or more items are out of stock or exceed available quantity. Please update your cart.',
      }));
      return;
    }

    submissionLockRef.current = true;
    setSubmitting(true);
    setErrors((previous) => ({ ...previous, submit: '' }));

    const orderPayload = {
      customerEmail: formData.email,
      customerName: formData.fullName,
      customerPhone: formData.phone,
      customerAddress: formData.address,
      customerCity: formData.city,
      customerAddressOnly: formData.address,
      landmark: formData.landmark,
      notes: formData.instructions,
      updateProfile: true,
      totalAmount: total,
      whatsappNumber: settings.whatsappNumber,
      couponCode: appliedCoupon?.code,
      items: cart.map((item) => ({
        productId: item.id || item._id || item.slug,
        slug: item.slug,
        packLabel: item.packLabel || '',
        name: item.Name || item.name,
        price: item.Price || item.price,
        quantity: item.quantity,
        image: getPrimaryProductImage(item)?.url || '',
      })),
    };

    (async () => {
      let placed = false;
      try {
        let result = await submitOrderAction({
          ...orderPayload,
          idempotencyKey: idempotencyKeyRef.current,
        });

        if (result?.success && result.duplicate) {
          idempotencyKeyRef.current = createIdempotencyKey();
          result = await submitOrderAction({
            ...orderPayload,
            idempotencyKey: idempotencyKeyRef.current,
          });
        }

        if (!result?.success || !result.orderId || result.duplicate) {
          setErrors((previous) => ({
            ...previous,
            submit: result?.error || 'Unable to place the order right now.',
          }));
          return;
        }

        placed = true;
        trackPurchaseEvent({ orderId: result.orderId, cart, total: result.totalAmount || total });
        idempotencyKeyRef.current = createIdempotencyKey();
        persistGuestOrder(result);
        setOrderState(result);
        clearCart();
      } catch (error) {
        setErrors((previous) => ({
          ...previous,
          submit: error.message || 'Unable to place the order right now.',
        }));
      } finally {
        if (!placed) {
          submissionLockRef.current = false;
          setSubmitting(false);
        }
      }
    })();
  }

  // ─── Loading / empty states ────────────────────────────────────────────────

  if (!isInitialized && !orderState.orderId) {
    return <CheckoutPageSkeleton />;
  }

  if (cart.length === 0 && !orderState.orderId) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <Empty className="flex w-full max-w-md flex-col items-center justify-center rounded-none border border-[#E8E5DF] bg-white py-12 px-6">
          <EmptyHeader>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#F4F2EE] text-[#A67C52]">
              <ShoppingBag className="size-6 stroke-[1.5]" />
            </div>
            <EmptyTitle className="font-serif text-2xl font-normal uppercase tracking-wide text-[#121212] [text-wrap:balance]">
              Your Cart Is Empty
            </EmptyTitle>
            <EmptyDescription className="max-w-xs text-center text-xs text-[#737373] mt-1 [text-wrap:pretty]">
              Explore our handcrafted jewelry collections and add your favourite pieces.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="mt-6">
            <Button
              onClick={() => router.push('/products')}
              className="min-h-11 rounded-none bg-[#121212] hover:bg-neutral-800 text-white text-xs uppercase tracking-[0.2em] font-medium px-8 transition-colors"
            >
              Explore Collection
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    );
  }

  const shouldShowCentralCheckoutLoader =
    !orderState.orderId &&
    isInitialized &&
    cart.length > 0 &&
    hasHydratedCachedProfile &&
    status === 'authenticated' &&
    !hasCachedProfile &&
    (isHydratingProfile || !hasAutoFilled);

  if (shouldShowCentralCheckoutLoader) {
    return <CheckoutPageSkeleton />;
  }

  if (orderState.orderId) {
    return (
      <div className="flex min-h-[90vh] items-center justify-center bg-gray-50/50 px-4 py-12">
        <OrderSuccessModal 
          isOpen={!!orderState.orderId} 
          onClose={handleModalClose} 
          orderId={orderState.orderId} 
          paymentMethod={orderState.paymentMethod || paymentMethod}
        />
      </div>
    );
  }

  const summaryProps = {
    cart,
    pricing,
    appliedCoupon,
    couponCodeInput,
    setCouponCodeInput,
    couponError,
    setCouponError,
    couponLoading,
    handleApplyCoupon,
    handleRemoveCoupon,
    addToCart,
    handleRequestRemove,
    handleQuantityDecrease,
    handleQuantityIncrease,
    relatedProducts: relatedProducts.map((p) => ({ ...p, id: p._id || p.id })),
    relatedOffset,
    isRefreshingRelated,
    handleRefreshRelated,
  };

  return (
    <div className={cn(submitting && 'pointer-events-none')}>
      {/* ── TOP NAV BAR ── */}
      <div className="sticky top-0 z-50 w-full bg-background border-b border-border/40 px-4 py-4 lg:px-8 flex items-center shadow-sm">
        <div className="w-full max-w-[1130px] mx-auto relative flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="inline-flex items-center gap-1.5 text-[0.95rem] font-medium text-foreground/90 hover:text-foreground hover:-translate-x-1 transition-all duration-200 ease-out z-10"
          >
            <ChevronLeft className="size-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <StoreLogo
              storeName={settings.storeName}
              lightLogoUrl={settings.lightLogoUrl}
              darkLogoUrl={settings.darkLogoUrl}
              logoScalePercent={settings.logoScalePercent}
              compact
            />
          </div>

          <div className="text-[1.1rem] sm:text-[1.35rem] font-medium text-foreground tracking-tight z-10 flex items-center gap-2">
            Checkout
          </div>
        </div>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} callbackUrl="/checkout" />

      {/* ══════════════════════════════════════════════
          MOBILE ORDER SUMMARY ACCORDION
      ══════════════════════════════════════════════ */}
      <div className={styles.mobileOrderSummary}>
        <button
          type="button"
          id="mobile-order-summary-toggle"
          className={styles.mobileOrderSummaryTrigger}
          onClick={() => setMobileOrderOpen((v) => !v)}
          aria-expanded={mobileOrderOpen}
        >
          <span className={styles.mobileOrderSummaryTriggerLeft}>
            <ShoppingBag className="size-3.5 shrink-0 text-[#A67C52]" />
            <span className="whitespace-nowrap">{mobileOrderOpen ? 'Hide order summary' : 'Show order summary'}</span>
            <ChevronDown
              className={cn(styles.mobileOrderSummaryChevron, mobileOrderOpen && styles.mobileOrderSummaryChevronOpen, "size-3.5 shrink-0 text-[#A67C52]")}
              aria-hidden
            />
          </span>
          <span className={styles.mobileOrderSummaryTotal}>Rs.&nbsp;{total.toLocaleString('en-PK')}</span>
        </button>

        {mobileOrderOpen && (
          <div className={styles.mobileOrderSummaryBody}>
            <div className={styles.mobileOrderSummaryBodyInner}>
              <OrderSummaryContent {...summaryProps} />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          TWO-PANEL CHECKOUT SHELL
      ══════════════════════════════════════════════ */}
      <div className={styles.checkoutShell}>

        {/* ── LEFT PANEL (forms) ── */}
        <div className={styles.leftPanel}>
          <div className={cn(styles.leftPanelInner, styles.enter)} style={{ '--checkout-delay': '60ms' }}>

            {/* ── CONTACT ── */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Contact</h2>
                {!session?.user ? (
                  <button
                    type="button"
                    className="text-[0.82rem] font-semibold text-primary hover:underline hover:opacity-80 transition-all cursor-pointer"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Log in
                  </button>
                ) : null}
              </div>

              <FieldGroup className="gap-3">
                <Field>
                  <FloatingLabelInput
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    spellCheck={false}
                    aria-label="Email address"
                    label="Email address (optional)"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address (optional)"
                    readOnly={!!session?.user}
                    className={session?.user ? 'cursor-not-allowed bg-muted/30' : ''}
                  />
                </Field>

                {!session?.user && (
                  <div 
                    onClick={() => setShowAuthModal(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowAuthModal(true)}
                    className={styles.checkboxRow}
                  >
                    <input
                      type="checkbox"
                      id="track-order-history-prompt"
                      checked={false}
                      readOnly
                      className="size-4 rounded accent-primary cursor-pointer pointer-events-none"
                    />
                    <label htmlFor="track-order-history-prompt" className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none text-[0.82rem]">
                      Sign in for live order tracking & saved details
                    </label>
                  </div>
                )}
              </FieldGroup>
            </div>

            {/* ── DELIVERY ── */}
            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>Delivery</h2>

              <FieldGroup className="gap-3">

                {/* Name / Phone row */}
                <div className={styles.inputRow2}>
                  <Field data-invalid={errors.fullName ? 'true' : undefined}>
                    <FloatingLabelInput
                      id="fullName"
                      name="fullName"
                      autoComplete="name"
                      spellCheck={false}
                      aria-label="Full name"
                      label="Full name"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isValid={isNameValid}
                      placeholder="Full name *"
                      aria-invalid={Boolean(errors.fullName)}
                    />
                    <FieldError>{errors.fullName}</FieldError>
                  </Field>
                  <Field data-invalid={errors.phone ? 'true' : undefined}>
                    <FloatingLabelInput
                      id="phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      aria-label="Phone number"
                      label="Phone number"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isValid={isPhoneValid}
                      placeholder="Phone *"
                      aria-invalid={Boolean(errors.phone)}
                    />
                    <FieldError>{errors.phone}</FieldError>
                  </Field>
                </div>

                {/* Address */}
                <Field data-invalid={errors.address ? 'true' : undefined}>
                  <FloatingLabelTextarea
                    id="address"
                    name="address"
                    autoComplete="street-address"
                    aria-label="Complete address"
                    label="Complete address"
                    rows={2}
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isValid={isAddressValid}
                    placeholder="Complete address"
                    aria-invalid={Boolean(errors.address)}
                  />
                  <FieldError>{errors.address}</FieldError>
                </Field>

                {/* City */}
                <Field data-invalid={errors.city ? 'true' : undefined}>
                  <Combobox
                    id="city"
                    items={CITY_OPTIONS}
                    filteredItems={visibleCityOptions}
                    value={selectedCity}
                    autoHighlight="always"
                    onInputValueChange={setCitySearch}
                    onValueChange={(city) => {
                      setFormData((previous) => ({ ...previous, city: city?.value || '' }));
                      setCitySearch('');
                      if (errors.city) {
                        setErrors((previous) => ({ ...previous, city: '' }));
                      }
                    }}
                  >
                    <ComboboxInput
                      placeholder="City *"
                      aria-invalid={Boolean(errors.city)}
                      showClear={Boolean(formData.city)}
                      inputClassName={cn(
                        'transition-none shadow-none',
                        'hover:border-transparent hover:bg-transparent',
                        'focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:shadow-none',
                        'data-[pressed]:scale-100 data-[pressed]:translate-y-0'
                      )}
                      triggerClassName="translate-y-0 scale-100 transition-none hover:bg-transparent active:translate-y-0 active:scale-100 data-[pressed]:translate-y-0 data-[pressed]:scale-100"
                      className={cn(
                        'h-12 text-[15px] md:text-sm rounded-xl border border-slate-300 dark:border-border/80 bg-card shadow-none transition-colors duration-150',
                        'hover:border-slate-400 dark:hover:border-border',
                        'focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15',
                        '[&_[data-slot=input-group-control]]:shadow-none [&_[data-slot=input-group-control]]:ring-0',
                        errors.city && 'border-destructive bg-destructive/5 ring-3 ring-destructive/15'
                      )}
                    />
                    <ComboboxContent
                      className="rounded-xl border border-slate-300 dark:border-border/80 bg-card p-0 shadow-lg"
                      sideOffset={8}
                    >
                      <ComboboxList className="max-h-72 p-2">
                        <ComboboxEmpty className="px-3 py-4 text-sm">No matching city found.</ComboboxEmpty>
                        <ComboboxGroup>
                          <ComboboxLabel>{normalizedCitySearch ? 'Search results' : 'Main cities'}</ComboboxLabel>
                          <ComboboxCollection>
                            {(city) => (
                              <ComboboxItem
                                key={city.value}
                                value={city}
                                className={cn(
                                  'rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-[background-color,color] duration-200 data-highlighted:bg-[color:color-mix(in_oklab,var(--color-muted)_58%,white)] sm:px-3.5',
                                  selectedCity?.value === city.value &&
                                    'bg-[color:color-mix(in_oklab,var(--color-primary)_8%,white)] text-primary'
                                )}
                              >
                                <span className="truncate leading-5">{city.label}</span>
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxGroup>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <FieldError>{errors.city}</FieldError>
                </Field>

                {/* Save for next time */}
                <div className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="save-info"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                  <label htmlFor="save-info">Save this information for next time</label>
                </div>
              </FieldGroup>
            </div>



            {/* ── PAYMENT ── */}
            <div className={styles.sectionBlock}>
              <h2 className={styles.sectionTitle}>Payment</h2>
              <p className={styles.sectionSubtitle}>All transactions are secure and encrypted.</p>

              <div className={styles.paymentOptions}>

                {/* Credit card — coming soon */}
                <div className={cn(styles.paymentOption, styles.paymentOptionDisabled, "relative overflow-hidden")}>
                  <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-primary/15 text-primary text-[0.55rem] sm:text-[0.6rem] font-bold px-2 py-0.5 rounded-bl-md uppercase tracking-wider z-10">
                    Coming soon
                  </div>
                  <div className={styles.paymentOptionHeader}>
                    <div className={styles.paymentOptionLeft}>
                      <div className={styles.radioCircle} />
                      <CreditCard className="size-4 text-muted-foreground shrink-0" aria-hidden />
                      <span className={styles.paymentOptionLabel}>Credit card</span>
                    </div>
                    <div className={styles.paymentCardLogos}>
                      <Image src="/VISA-logo.png" alt="Visa" width={36} height={24} className={styles.paymentCardLogo} style={{ width: 'auto' }} />
                      <Image src="/Mastercard-Logo.png" alt="Mastercard" width={36} height={24} className={styles.paymentCardLogo} style={{ width: 'auto' }} />
                    </div>
                  </div>
                </div>

                {/* Cash on Delivery */}
                <div
                  id="payment-cod"
                  role="radio"
                  aria-checked={paymentMethod === 'cod'}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPaymentMethod('cod'); } }}
                  className={styles.paymentOption}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <div className={cn(styles.paymentOptionHeader, paymentMethod === 'cod' && styles.paymentOptionSelectedBg)}>
                    <div className={styles.paymentOptionLeft}>
                      <div className={cn(styles.radioCircle, paymentMethod === 'cod' && styles.radioCircleActive)}>
                        {paymentMethod === 'cod' && <div className={styles.radioDot} />}
                      </div>
                      <Banknote className="size-4 text-muted-foreground" aria-hidden />
                      <span className={styles.paymentOptionLabel}>Cash on Delivery (COD)</span>
                    </div>
                  </div>
                </div>

                {/* Bank Deposit */}
                {settings?.bankDepositEnabled && (
                  <div
                    id="payment-bank"
                    role="radio"
                    aria-checked={paymentMethod === 'bank'}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPaymentMethod('bank'); } }}
                    className={styles.paymentOption}
                    onClick={() => setPaymentMethod('bank')}
                  >
                    <div className={cn(styles.paymentOptionHeader, paymentMethod === 'bank' && styles.paymentOptionSelectedBg)}>
                      <div className={styles.paymentOptionLeft}>
                        <div className={cn(styles.radioCircle, paymentMethod === 'bank' && styles.radioCircleActive)}>
                          {paymentMethod === 'bank' && <div className={styles.radioDot} />}
                        </div>
                        <span className={styles.paymentOptionLabel}>Bank Deposit</span>
                      </div>
                    </div>

                    {paymentMethod === 'bank' && (
                      <div className={styles.bankInfo}>
                        <p className="font-semibold">
                          Send payment slip to:{' '}
                          <a
                            href={createWhatsAppUrl(settings?.whatsappNumber, 'Salam, sending bank transfer payment slip for my order.') || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {settings?.whatsappNumber}
                          </a>
                        </p>
                        <div className={styles.bankInfoCode}>
                          {settings?.bankDepositAccountDetails || 'Account details will appear here.'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing address row */}
              <div className={styles.billingRow}>
                <input
                  type="checkbox"
                  id="billing-same"
                  defaultChecked
                  className="size-4 rounded accent-primary"
                />
                <label htmlFor="billing-same" className="cursor-pointer text-sm">
                  Use shipping address as billing address
                </label>
              </div>
            </div>

            {/* Special instructions (Hidden for now) */}
            {/* <div className={styles.sectionBlock}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="instructions">Special Notes (optional)</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="instructions"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Any special delivery instructions…"
                    />
                    <FieldDescription>Optional delivery notes.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </div> */}

            {/* Mobile Order Summary (Bottom - Always Open) */}
            <div className="md:hidden mt-6 mb-3 border-t border-border/60 pt-6">
              <h2 className={styles.sectionTitle}>Order Summary</h2>
              <OrderSummaryContent {...summaryProps} />
            </div>

            {/* Submit error */}
            {errors.submit ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Unable to place order</AlertTitle>
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            ) : null}

            {/* Hidden submit trigger for form */}
            <form onSubmit={handlePlaceOrder}>
              <button type="submit" id="checkout-submit" className="hidden" />
            </form>

            {/* Desktop CTA */}
            <button
              id="place-order-desktop"
              type="button"
              className={cn(
                'hidden md:flex w-full h-13 rounded-xl items-center justify-center gap-2 font-bold text-base transition-all duration-300',
                submitting ? 'cursor-wait' : 'cursor-pointer',
                isFormComplete
                  ? 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md active:scale-[0.98]'
                  : 'bg-card text-foreground border border-slate-300 hover:bg-muted/40 shadow-none'
              )}
              onClick={() => document.getElementById('checkout-submit')?.click()}
              disabled={submitting || !isInitialized || hasStockIssue}
              aria-busy={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? 'Placing order…' : paymentMethod === 'card' ? 'Pay now' : 'Complete order'}
            </button>

            {/* Footer links */}
            <div className={styles.trustLinks}>
              <Link href="/refund-policy" className={styles.trustLink}>Refund policy</Link>
              <Link href="/privacy-policy" className={styles.trustLink}>Privacy policy</Link>
              <Link href="/terms-of-service" className={styles.trustLink}>Terms of service</Link>
              <Link href="/contact" className={styles.trustLink}>Contact</Link>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (order summary — desktop only) ── */}
        <div className={styles.rightPanel}>
          <div className={cn(styles.rightPanelInner, styles.enter)} style={{ '--checkout-delay': '120ms' }}>
            <OrderSummaryContent {...summaryProps} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE STICKY BOTTOM BAR
      ══════════════════════════════════════════════ */}
      <div className={styles.mobileCheckoutBar}>
        <div className={styles.mobileCheckoutInner}>
          <div className={styles.mobileAmount}>
            <span className={styles.mobileAmountLabel}>Total</span>
            <strong>Rs.&nbsp;{total.toLocaleString('en-PK')}</strong>
          </div>
          <button
            id="place-order-mobile"
            type="button"
            className={cn(
              'h-11 px-5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all duration-300 shrink-0',
              submitting ? 'cursor-wait min-w-[148px]' : 'cursor-pointer',
              isFormComplete
                ? 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm active:scale-[0.97]'
                : 'bg-card text-foreground border border-slate-300 hover:bg-muted/40 shadow-none'
            )}
            onClick={() => document.getElementById('checkout-submit')?.click()}
            disabled={submitting || !isInitialized || hasStockIssue}
            aria-busy={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? 'Placing order…' : paymentMethod === 'card' ? 'Pay now' : 'Complete order'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          REMOVE ITEM CONFIRMATION DIALOG
      ══════════════════════════════════════════════ */}
      <Dialog open={isRemoveModalOpen} onOpenChange={setIsRemoveModalOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <span>Remove Item from Order?</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to remove this item from your checkout?
            </DialogDescription>
          </DialogHeader>

          {itemToRemove && (
            <div className="flex items-center gap-3.5 p-3.5 my-2 rounded-xl border border-border/60 bg-muted/30">
              <div 
                className="relative size-14 shrink-0 rounded-lg overflow-hidden border border-border/40 flex items-center justify-center"
                style={{ backgroundColor: getProductCategoryBgColor(itemToRemove) }}
              >
                {getPrimaryProductImage(itemToRemove)?.url ? (
                  <Image
                    src={getPrimaryProductImage(itemToRemove).url}
                    alt={itemToRemove.Name || itemToRemove.name}
                    fill
                    className="object-cover p-1"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  {itemToRemove.Name || itemToRemove.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Qty: {itemToRemove.quantity} · {formatPriceLabel((itemToRemove.Price || itemToRemove.price) * itemToRemove.quantity)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRemoveModalOpen(false);
                setItemToRemove(null);
              }}
              className="rounded-xl px-4"
            >
              Keep Item
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              className="rounded-xl px-4 font-semibold"
            >
              Yes, Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useTransition, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { formatDistanceToNow } from 'date-fns';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Calendar, Eye, Receipt, RotateCcw, Search, Trash2, X, Download, Edit, Zap, Check, ChevronsUpDown, MoreHorizontal, FileSpreadsheet, PackageCheck, Truck, Plus, Printer, Send, FileText, Upload, Globe, UserCog } from 'lucide-react';
import AppPagination from '@/components/AppPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import NocTrackingModal from '@/components/NocTrackingModal';
import SyncNocSheetModal from '@/components/admin/SyncNocSheetModal';
import { NOC_PORTALS } from '@/lib/nocCourier';
import {
  sanitizePdfText,
  escapeHtml,
  formatPrintCurrency,
  formatPrintAddress,
  buildPrintDocument,
  blobToPngDataUrl,
  loadImageDataUrl,
  collectSourcingSlipData,
  renderSourcingPrintMarkup,
  renderPackingPrintMarkup,
} from './orderPrintUtils';
const OrderQuickViewDialog = dynamic(() => import('./OrderQuickViewDialog'));
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { getBlurPlaceholderProps } from '@/lib/imagePlaceholder';
import { getPrimaryProductImage } from '@/lib/productImages';
import { getProductCategoryNames } from '@/lib/productCategories';
import { cn } from '@/lib/utils';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { bulkDeleteOrdersAction, bulkUpdateOrderStatusAction, createDraftOrderAction, deleteOrderAction, emptyTrashAction, hardDeleteOrderAction, restoreOrderAction, updateOrderAction } from '@/app/actions';
import { DEFAULT_ADMIN_FILTER_STATUS, DEFAULT_ORDER_STATUS, ORDER_STATUSES, normalizeOrderStatus } from '@/lib/order-status';
import { formatSmartTimeAgo, formatFullDateTime, formatFullDate, formatFullTime } from '@/lib/timeAgo';
import { toast } from 'sonner';

async function safeReadJson(res) {
  try {
    const text = await res.text();
    if (!text) return { success: false, error: 'Empty response received from server.' };
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: `Server returned non-JSON response (${res.status} ${res.statusText || ''}).`.trim(),
    };
  }
}

export function getOrderOriginInfo(order) {
  const isAdmin = 
    order?.orderType === 'Admin' ||
    Boolean(order?.isDraft) ||
    Boolean(order?.sourceTag && String(order.sourceTag).trim() !== '') ||
    Boolean(order?.invoiceId || order?.invoiceNumber) ||
    (order?.manualCodAmount !== undefined && order?.manualCodAmount !== null && order?.manualCodAmount !== '') ||
    Boolean(order?.itemType && order?.itemType !== 'Mix');

  const isOnline = !isAdmin && (order?.orderType === 'Online' || !order?.orderType);
  const tag = order?.sourceTag || '';

  return {
    isOnline,
    isAdmin,
    label: isOnline ? 'Online (Website)' : (tag ? `Admin (${tag})` : 'Created by Admin'),
    shortLabel: isOnline ? 'Online' : (tag || 'Admin'),
    tooltip: isOnline 
      ? 'Online Order (Placed by customer on website)' 
      : `Created by Admin${tag ? ` • Channel: ${tag}` : ' (Manual / Draft)'}`,
    badgeClass: isOnline 
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300' 
      : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    iconClass: 'text-foreground shrink-0 select-none',
  };
}

const statusVariant = {
  'Order Confirmed': 'primary',
  'In Process': 'secondary',
  Packed: 'secondary',
  Shipped: 'secondary',
  'Out For Delivery': 'secondary',
  Delivered: 'secondary',
  Returned: 'outline',
};

const BULK_STATUS_OPTIONS = ORDER_STATUSES;
const DRAFT_TAB_ID = 'draft';
const TRASH_TAB_ID = 'trash';
const DRAFT_SOURCE_OPTIONS = [
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Insta', label: 'Insta' },
  { value: 'Others', label: 'Others' },
];

// Deterministic city → pastel color mapping for visual scanning
const CITY_COLOR_PALETTE = [
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-pink-100 text-pink-800 border-pink-200',
];

function getCityColorClass(city) {
  if (!city) return 'bg-slate-100 text-slate-600 border-slate-200';
  let hash = 0;
  for (let i = 0; i < city.length; i++) {
    hash = city.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CITY_COLOR_PALETTE[Math.abs(hash) % CITY_COLOR_PALETTE.length];
}

const formatPrice = (price) => `PKR ${Number(price || 0).toLocaleString('en-PK')}`;

const getCodAmount = (order) => {
  if (order?.manualCodAmount != null && order.manualCodAmount !== '') {
    return Number(order.manualCodAmount);
  }
  return Number(order?.totalAmount || 0);
};

const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatWeight = (weight) => `${Number(weight || 0).toFixed(1)} kg`;

const isNewOrder = (dateStr) => {
  if (!dateStr) return false;
  const orderDate = new Date(dateStr);
  const now = new Date();
  const diffHours = (now - orderDate) / (1000 * 60 * 60);
  return diffHours <= 24;
};



function getStatusBadgeClass(status) {
  const normalizedStatus = normalizeOrderStatus(status).toLowerCase();

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

function getEffectiveNocStatusTime(order) {
  if (!order) return null;
  const currentStatus = (order.nocStatus || '').trim().toUpperCase();
  if (currentStatus && Array.isArray(order.nocTrackingEvents) && order.nocTrackingEvents.length > 0) {
    const matchingEvent = order.nocTrackingEvents.find(
      (e) => (e.status || '').trim().toUpperCase() === currentStatus
    );
    if (matchingEvent && (matchingEvent.dateTime || matchingEvent.timestamp)) {
      return matchingEvent.dateTime || matchingEvent.timestamp;
    }
  }
  return order.nocStatusTime || order.courierBookingDate || null;
}

function buildHref(pathname, searchParams, updates) {
  const params = new URLSearchParams(searchParams?.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '' || (key === 'status' && value === DEFAULT_ADMIN_FILTER_STATUS) || (key === 'paymentFilter' && value === 'all')) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function OrdersTablePendingSkeleton({ showNocColumns = false }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block shadow-xs">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-8 px-2 py-2 text-center">
              <Skeleton className="size-3.5 rounded-sm mx-auto" />
            </th>
            <th className="px-2.5 py-2"><Skeleton className="h-3 w-14 rounded" /></th>
            <th className="px-2.5 py-2"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="px-2 py-2"><Skeleton className="h-3 w-12 rounded" /></th>
            <th className="px-2.5 py-2"><Skeleton className="h-3 w-16 rounded" /></th>
            <th className="px-2 py-2"><Skeleton className="h-3 w-12 rounded" /></th>
            {showNocColumns && <th className="px-2.5 py-2"><Skeleton className="h-3 w-24 rounded" /></th>}
            {showNocColumns && <th className="px-2.5 py-2"><Skeleton className="h-3 w-20 rounded" /></th>}
            <th className="px-2.5 py-2 text-right"><Skeleton className="h-3 w-14 rounded ml-auto" /></th>
            <th className="px-2.5 py-2 text-center"><Skeleton className="h-3 w-14 rounded mx-auto" /></th>
            <th className="w-16 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/15">
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
              {showNocColumns && (
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-22 rounded font-mono" />
                    <Skeleton className="h-2.5 w-14 rounded" />
                  </div>
                </td>
              )}
              {showNocColumns && (
                <td className="px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-18 rounded" />
                    <Skeleton className="h-2.5 w-12 rounded" />
                  </div>
                </td>
              )}
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
  );
}

function OrdersMobilePendingSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border border-y border-border bg-card md:hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton className="size-4 rounded-sm shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminOrdersClient({
  initialOrders,
  productCatalog,
  total,
  totalPages,
  currentPage,
  pageSize,
  initialSearchQuery,
  initialStatusFilter,
  initialPaymentFilter = 'all',
  initialStartDate,
  initialEndDate,
  summary,
  initialTrashOrders = [],
  initialCreateOrder = false,
  enableSecondaryNoc = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startNavTransition] = useTransition();
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [paymentFilter, setPaymentFilter] = useState(initialPaymentFilter || 'all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [pendingWorkflowAction, setPendingWorkflowAction] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [createSourceOpen, setCreateSourceOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const searchTimeoutRef = useRef(null);
  const hasAutoSyncedRef = useRef(false);
  const defaultUnknownItem = { productId: 'unknown-default', isCustom: true, name: 'Unknown item', price: 100, quantity: 1 };
  const [draftForm, setDraftForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: '',
    landmark: '',
    sourceTag: '',
    itemType: 'Mix',
    weight: '2',
    notes: '',
    manualCodAmount: '',
    customItemName: '',
    customItemPrice: '',
  });
  const [draftItems, setDraftItems] = useState([defaultUnknownItem]);
  const [createLinkedInvoice, setCreateLinkedInvoice] = useState(true); // default ON
  
  // Modals & Popovers State
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductSearch, setEditProductSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Quick Action State (Status/Tracking)
  const [quickActionOrder, setQuickActionOrder] = useState(null);
  const [quickStatus, setQuickStatus] = useState('');
  const [quickTracking, setQuickTracking] = useState('');
  const [isQuickUpdating, setIsQuickUpdating] = useState(false);
  
  const [cityOpen, setCityOpen] = useState(false);

  // NOC Courier Integration State
  const [nocBookingOpen, setNocBookingOpen] = useState(false);
  const [selectedNocPortal, setSelectedNocPortal] = useState('portal_1');
  const [isBookingNoc, setIsBookingNoc] = useState(false);
  const [nocTrackingOrder, setNocTrackingOrder] = useState(null);
  const [nocPrintResult, setNocPrintResult] = useState(null);
  const [nocPrintAccountModal, setNocPrintAccountModal] = useState(null);
  const [isSyncSheetModalOpen, setIsSyncSheetModalOpen] = useState(false);

  const handleBulkNocBooking = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to book with NOC Courier');
      return;
    }
    setIsBookingNoc(true);
    try {
      const res = await fetch('/api/admin/courier/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrders,
          portalKey: selectedNocPortal,
        }),
      });

      const data = await safeReadJson(res);
      if (data.success) {
        toast.success(data.message || `Successfully booked ${selectedOrders.length} parcel(s) with NOC Express!`);
        setNocBookingOpen(false);
        setNocPrintResult({
          count: data.updatedOrders?.length || selectedOrders.length,
          orders: data.updatedOrders || [],
          labelUrl: data.labelUrl || '',
          labelUrls: data.labelUrls || [],
          parcelNumbers: data.parcelNumbers || [],
          portalKey: data.portalKey || selectedNocPortal,
          failedOrders: data.failedOrders || [],
        });

        // Instantly filter out booked orders from Draft/Packed/In Process tabs so they move to Shipped!
        const selectedSet = new Set(selectedOrders.map((id) => String(id)));
        setOrders((prev) => {
          if (statusFilter === DRAFT_TAB_ID || statusFilter === 'Packed' || statusFilter === 'In Process' || statusFilter === 'Order Confirmed') {
            return prev.filter((o) => !selectedSet.has(String(o._id)) && !selectedSet.has(String(o.orderId)));
          }
          return prev.map((o) => {
            const matches = selectedSet.has(String(o._id)) || selectedSet.has(String(o.orderId));
            if (matches) {
              const updatedItem = data.updatedOrders?.find((u) => String(u.orderId) === String(o.orderId));
              return {
                ...o,
                status: 'Shipped',
                isDraft: false,
                courierName: 'NOC Express',
                nocAccountId: selectedNocPortal,
                nocLabelUrl: updatedItem?.labelUrl || o.nocLabelUrl,
                trackingNumber: updatedItem?.trackingNumber || o.trackingNumber,
              };
            }
            return o;
          });
        });

        setSelectedOrders([]);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to book parcels with NOC Express');
      }
    } catch (error) {
      console.error('NOC Booking Error:', error);
      toast.error('Connection error while booking with NOC Express');
    } finally {
      setIsBookingNoc(false);
    }
  };

  // NOC Status Sync State & Handler
  const [syncingOrderId, setSyncingOrderId] = useState(null);
  const [isBulkSyncingNoc, setIsBulkSyncingNoc] = useState(false);

  const getNocStatusBadgeClass = (status) => {
    if (!status) return 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
    const s = String(status).toLowerCase();
    if (s.includes('payment') || s.includes('paid') || s.includes('remit') || s.includes('cr done')) {
      return 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200';
    }
    if (s.includes('delivered') || s.includes('complete')) {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    }
    if (s.includes('transit') || s.includes('dispatch') || s.includes('pickup') || s.includes('arrival')) {
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    }
    if (s.includes('out for delivery') || s.includes('delivery') || s.includes('courier')) {
      return 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
    }
    if (s.includes('return') || s.includes('fail') || s.includes('cancel') || s.includes('refuse')) {
      return 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    }
    return 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  };

  const handleSyncNocStatus = async (orderIdList) => {
    const rawIds = Array.isArray(orderIdList) ? orderIdList : [orderIdList];
    const ids = rawIds.filter(Boolean);
    if (ids.length === 0) return;

    if (ids.length === 1) {
      setSyncingOrderId(String(ids[0]));
    } else {
      setIsBulkSyncingNoc(true);
    }

    try {
      const res = await fetch('/api/admin/courier/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });

      const data = await safeReadJson(res);
      if (data.success && Array.isArray(data.results)) {
        const resultMap = new Map();
        data.results.forEach((r) => {
          if (r.nocStatus) {
            resultMap.set(String(r._id), r);
            if (r.orderId) resultMap.set(String(r.orderId), r);
          }
        });

        setOrders((prev) =>
          prev.map((o) => {
            const found = resultMap.get(String(o._id)) || (o.orderId ? resultMap.get(String(o.orderId)) : null);
            if (found) {
              return {
                ...o,
                courierName: found.courierName || o.courierName,
                nocParcelNo: found.nocParcelNo || o.nocParcelNo,
                nocThirdPartyNo: found.nocThirdPartyNo !== undefined ? found.nocThirdPartyNo : o.nocThirdPartyNo,
                nocStatus: found.nocStatus,
                nocStatusTime: found.nocStatusTime,
                nocRemarks: found.nocRemarks,
                nocLastTrackedAt: found.nocLastTrackedAt,
                nocTrackingEvents: found.nocTrackingEvents || o.nocTrackingEvents,
              };
            }
            return o;
          })
        );

        if (data.changedCount > 0) {
          toast.success(`Updated ${data.changedCount} order status${data.changedCount === 1 ? '' : 'es'} successfully.`);
          router.refresh();
        } else {
          toast.info('Already up to date - No new status changes found.');
        }
      } else {
        toast.error(data.error || 'Failed to sync NOC status');
      }
    } catch (err) {
      console.error('NOC status sync error:', err);
      toast.error('Connection error syncing NOC status');
    } finally {
      setSyncingOrderId(null);
      setIsBulkSyncingNoc(false);
    }
  };

  // Auto-sync active orders in background on first visit (with 15 min debounce)
  useEffect(() => {
    try {
      const lastAutoSync = sessionStorage.getItem('admin_orders_last_auto_sync');
      const now = Date.now();
      if (!lastAutoSync || now - Number(lastAutoSync) > 15 * 60 * 1000) {
        sessionStorage.setItem('admin_orders_last_auto_sync', String(now));
        const activeIds = orders
          .filter(
            (o) =>
              (o.trackingNumber || o.nocParcelNo || o.nocThirdPartyNo) &&
              !['Delivered', 'Completed', 'Returned', 'Cancelled'].includes(o.status)
          )
          .map((o) => o._id);

        if (activeIds.length > 0) {
          fetch('/api/admin/courier/sync-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds: activeIds }),
          })
            .then(safeReadJson)
            .then((data) => {
              if (data?.success && Array.isArray(data.results) && data.changedCount > 0) {
                router.refresh();
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      // ignore
    }
  }, [orders, router]);

  const handlePrintSelectedNocSlips = () => {
    const selectedSet = new Set(selectedOrders.map((id) => String(id)));
    const selectedObjList = orders.filter(
      (o) => selectedSet.has(String(o._id)) || selectedSet.has(String(o.orderId))
    );

    const bookedOrders = selectedObjList.filter((o) => o.nocLabelUrl || o.nocParcelNo || o.trackingNumber);

    if (bookedOrders.length === 0) {
      toast.error('No NOC parcel or tracking numbers found for selected orders. Please book with NOC Express first.');
      return;
    }

    const slipsToOpen = bookedOrders.map((o) => o.nocLabelUrl).filter(Boolean);
    if (slipsToOpen.length > 0) {
      slipsToOpen.forEach((url, index) => {
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 300);
      });
      toast.success(`Opening ${slipsToOpen.length} official NOC slip(s) in new tabs...`);
      return;
    }

    toast.error('No official NOC Slip URL available for selected order(s).');
  };

  // Trash & Delete State
  const [trashOrders, setTrashOrders] = useState(initialTrashOrders);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, orderId, label }
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [hardDeletingId, setHardDeletingId] = useState(null);
  const [confirmHardDeleteOrder, setConfirmHardDeleteOrder] = useState(null);

  // Auto-Sync NOC / Courier Status on Page Load (guarded with ref to run once per session/mount)
  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;

    const activeOrders = (initialOrders || []).filter(
      (o) => o.nocParcelNo || o.trackingNumber || o.nocThirdPartyNo || ['Shipped', 'Out For Delivery', 'In Process', 'Packed', 'Delivered'].includes(normalizeOrderStatus(o.status))
    );
    if (activeOrders.length === 0) {
      toast.info('Already up to date - No new status changes found.');
      return;
    }

    const ids = activeOrders.map((o) => o._id || o.orderId).filter(Boolean);
    if (ids.length === 0) {
      toast.info('Already up to date - No new status changes found.');
      return;
    }

    (async () => {
      setIsBulkSyncingNoc(true);
      try {
        const res = await fetch('/api/admin/courier/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: ids }),
        });
        const data = await safeReadJson(res);
        if (data.success && Array.isArray(data.results)) {
          const resultMap = new Map();
          data.results.forEach((r) => {
            if (r.nocStatus) {
              resultMap.set(String(r._id), r);
              if (r.orderId) resultMap.set(String(r.orderId), r);
            }
          });

          setOrders((prev) =>
            prev.map((o) => {
              const found = resultMap.get(String(o._id)) || (o.orderId ? resultMap.get(String(o.orderId)) : null);
              if (found) {
                return {
                  ...o,
                  courierName: found.courierName || o.courierName,
                  nocParcelNo: found.nocParcelNo || o.nocParcelNo,
                  nocThirdPartyNo: found.nocThirdPartyNo !== undefined ? found.nocThirdPartyNo : o.nocThirdPartyNo,
                  nocStatus: found.nocStatus,
                  nocStatusTime: found.nocStatusTime,
                  nocRemarks: found.nocRemarks,
                  nocLastTrackedAt: found.nocLastTrackedAt,
                  nocTrackingEvents: found.nocTrackingEvents || o.nocTrackingEvents,
                };
              }
              return o;
            })
          );

          if (data.changedCount > 0) {
            toast.success(`Updated ${data.changedCount} order status${data.changedCount === 1 ? '' : 'es'} successfully.`);
            router.refresh();
          } else {
            toast.info('Already up to date - No new status changes found.');
          }
        }
      } catch (err) {
        console.warn('Auto-sync NOC status on load:', err);
      } finally {
        setIsBulkSyncingNoc(false);
      }
    })();
  }, [initialOrders, router]);

  // Bulk Move to Trash Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedOrders.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteOrdersAction(selectedOrders);
      if (res.success) {
        const deletedSet = new Set(res.deletedIds || selectedOrders.map(String));
        const deletedObjs = orders.filter((o) => deletedSet.has(String(o._id)) || deletedSet.has(String(o.orderId)));
        
        setOrders((prev) => prev.filter((o) => !deletedSet.has(String(o._id)) && !deletedSet.has(String(o.orderId))));
        setTrashOrders((prev) => [
          ...deletedObjs.map((o) => ({
            _id: o._id,
            orderId: o.orderId,
            customerName: o.customerName,
            customerPhone: o.customerPhone || '',
            totalAmount: o.totalAmount || 0,
            isDraft: o.isDraft === true,
            deletedAt: new Date().toISOString(),
            createdAt: o.createdAt || new Date().toISOString(),
          })),
          ...prev,
        ]);
        setSelectedOrders([]);
        setBulkDeleteConfirmOpen(false);
        toast.success(res.message || `Moved ${deletedObjs.length || selectedOrders.length} order(s) to Trash.`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to move selected orders to Trash.');
      }
    } catch (err) {
      console.error('Bulk trash error:', err);
      toast.error('Failed to move selected orders to Trash.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Auto-open create modal if navigated from admin home with ?createOrder=1
  useEffect(() => {
    if (initialCreateOrder) {
      setIsCreateModalOpen(true);
    }
  }, [initialCreateOrder]);

  useEffect(() => {
    setOrders(initialOrders);
    setSelectedOrders([]);
  }, [initialOrders]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    setStatusFilter(initialStatusFilter);
    setPaymentFilter(initialPaymentFilter);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialSearchQuery, initialStatusFilter, initialPaymentFilter, initialStartDate, initialEndDate]);

  const [catalog, setCatalog] = useState(productCatalog || []);
  const catalogFetchedRef = useRef(false);
  const catalogQueryRef = useRef('');
  const catalogSearchTimerRef = useRef(null);

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) return;

    let cancelled = false;
    const q = catalogQueryRef.current;
    const url = q
      ? `/api/admin/products/catalog?q=${encodeURIComponent(q)}&limit=40`
      : '/api/admin/products/catalog?limit=40';

    catalogFetchedRef.current = true;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.products) setCatalog(data.products);
      })
      .catch((err) => {
        console.error(err);
        catalogFetchedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [isCreateModalOpen, isEditModalOpen]);

  const draftTotalAmount = draftItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  const filteredDraftCities = useMemo(() => {
    const query = String(draftForm.customerCity || '').trim().toLowerCase();
    if (!query) {
      return PAKISTAN_CITIES.slice(0, 8);
    }

    return PAKISTAN_CITIES.filter((city) => city.toLowerCase().includes(query)).slice(0, 8);
  }, [draftForm.customerCity]);
  const availableDraftProducts = useMemo(() => {
    const selectedProductIds = new Set(draftItems.map((item) => item.productId));

    return (Array.isArray(catalog) ? catalog : [])
      .filter((product) => !selectedProductIds.has(String(product?._id || product?.slug || '').trim()))
      .map((product) => {
        const categoryNames = getProductCategoryNames(product);
        const primaryImage = getPrimaryProductImage(product);

        return {
          product,
          categoryNames,
          categorySummary: categoryNames.slice(0, 2),
          primaryImage,
          searchValue: [product.Name, product.slug || '', ...categoryNames].filter(Boolean).join(' '),
        };
      });
  }, [draftItems, catalog]);

  // Quick Add: first 3 products from catalog not already in draft
  const quickAddProducts = useMemo(() => {
    const selectedProductIds = new Set(draftItems.map((item) => item.productId));
    return (Array.isArray(catalog) ? catalog : [])
      .filter((p) => !selectedProductIds.has(String(p?._id || p?.slug || '').trim()))
      .slice(0, 3);
  }, [draftItems, catalog]);

  const availableEditProducts = useMemo(() => {
    const selectedProductIds = new Set(editItems.map((item) => String(item.productId || item._id || item.name)));

    return (Array.isArray(catalog) ? catalog : [])
      .map((product) => {
        const categoryNames = getProductCategoryNames(product);
        const primaryImage = getPrimaryProductImage(product);

        return {
          product,
          categoryNames,
          categorySummary: categoryNames.slice(0, 2),
          primaryImage,
          searchValue: [product.Name, product.slug || '', ...categoryNames].filter(Boolean).join(' '),
        };
      });
  }, [editItems, catalog]);

  const displayOrders = orders;

  function navigate(updates) {
    const isExplicitAllDates = updates.allDates === '1' || updates.startDate === 'all';
    const cleanUpdates = { ...updates };
    if (updates.startDate || updates.endDate) {
      cleanUpdates.allDates = null;
    }
    if (isExplicitAllDates) {
      cleanUpdates.startDate = null;
      cleanUpdates.endDate = null;
      cleanUpdates.allDates = '1';
    }
    const href = buildHref(pathname, searchParams, {
      ...cleanUpdates,
      paymentFilter: cleanUpdates.status && cleanUpdates.status !== 'Delivered' ? null : (cleanUpdates.paymentFilter !== undefined ? cleanUpdates.paymentFilter : (statusFilter === 'Delivered' ? paymentFilter : null)),
    });
    startNavTransition(() => {
      router.push(href);
    });
  }

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(DEFAULT_ADMIN_FILTER_STATUS);
    setStartDate('');
    setEndDate('');
    navigate({ search: null, status: null, startDate: null, endDate: null, allDates: '1', page: null });
  };

  const handleQuickDateFilter = (value) => {
    let newStart = '';
    let newEnd = '';
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (value === 'all') {
      setStartDate('');
      setEndDate('');
      navigate({
        search: searchQuery.trim() || null,
        startDate: null,
        endDate: null,
        allDates: '1',
        page: null,
      });
      return;
    }

    if (value === 'today') {
      newStart = todayStr;
      newEnd = todayStr;
    } else if (value === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      newStart = yesterday.toISOString().split('T')[0];
      newEnd = newStart;
    } else if (value === 'thisWeek') {
      const day = today.getDay(); // 0 is Sunday
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      newStart = monday.toISOString().split('T')[0];
      newEnd = todayStr;
    } else if (value === 'lastWeek') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      newStart = lastWeek.toISOString().split('T')[0];
      newEnd = todayStr;
    } else if (value === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      newStart = firstDay.toISOString().split('T')[0];
      newEnd = todayStr;
    } else if (value === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      newStart = firstDayLastMonth.toISOString().split('T')[0];
      newEnd = lastDayLastMonth.toISOString().split('T')[0];
    } else if (value === 'year2026') {
      newStart = '2026-01-01';
      newEnd = '2026-12-31';
    } else if (value === 'year2025') {
      newStart = '2025-01-01';
      newEnd = '2025-12-31';
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    
    navigate({
      search: searchQuery.trim() || null,
      startDate: newStart || null,
      endDate: newEnd || null,
      allDates: null,
      page: null,
    });
  };

  const getQuickDateValue = () => {
    if (!startDate && !endDate) return 'all';
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    
    if (startDate === todayStr && endDate === todayStr) return 'today';
    if (startDate === yesterdayStr && endDate === yesterdayStr) return 'yesterday';
    if (startDate === '2026-01-01' && endDate === '2026-12-31') return 'year2026';
    if (startDate === '2025-01-01' && endDate === '2025-12-31') return 'year2025';
    
    const day = new Date().getDay();
    const diff = new Date().getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date();
    monday.setDate(diff);
    if (startDate === monday.toISOString().split('T')[0] && endDate === todayStr) return 'thisWeek';

    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    if (startDate === lastWeekDate.toISOString().split('T')[0] && endDate === todayStr) return 'lastWeek';
    
    const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    if (startDate === firstDayThisMonth && endDate === todayStr) return 'thisMonth';

    const firstDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
    if (startDate === firstDayLastMonth && endDate === lastDayLastMonth) return 'lastMonth';
    
    return 'custom';
  };

  const isAllPaginatedSelected = displayOrders.length > 0 && displayOrders.every(o => o && selectedOrders.includes(o._id));

  const handleSelectAll = (checked) => {
    if (checked) {
      const newSelected = new Set(selectedOrders);
      displayOrders.forEach(o => {
        if (o?._id) newSelected.add(o._id);
      });
      setSelectedOrders(Array.from(newSelected));
    } else {
      setSelectedOrders(selectedOrders.filter(id => !displayOrders.find(o => o?._id === id)));
    }
  };

  const handleSelectOne = (checked, id) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, id]);
    } else {
      setSelectedOrders(selectedOrders.filter(oId => oId !== id));
    }
  };

  const getSelectedOrders = () => orders.filter((order) => selectedOrders.includes(order._id));
  const getOrderDisplayStatus = (order) => (order?.isDraft ? 'Draft' : normalizeOrderStatus(order?.status));

  const resetDraftComposer = () => {
    setDraftForm({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerCity: '',
      landmark: '',
      sourceTag: '',
      itemType: 'Mix',
      weight: '2',
      notes: '',
      manualCodAmount: '',
      customItemName: '',
      customItemPrice: '',
    });
    setDraftItems([{ productId: 'unknown-default', isCustom: true, name: 'Unknown item', price: 100, quantity: 1 }]);
    setCreateSourceOpen(false);
    setProductPickerOpen(false);
    setCitySuggestionsOpen(false);
  };

  const updateDraftField = (field, value) => {
    setDraftForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addDraftProduct = (product) => {
    const productId = String(product?._id || product?.slug || '').trim();
    if (!productId) return;

    setDraftItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId,
          name: product.Name,
          price: Number(product.discountedPrice ?? product.Price ?? 0),
          image: getPrimaryProductImage(product)?.url || '',
          quantity: 1,
        },
      ];
    });
    setProductPickerOpen(false);
  };

  const addEditProduct = (product) => {
    const productId = String(product?._id || product?.slug || '').trim();
    if (!productId) return;

    setEditItems((current) => {
      const existingIndex = current.findIndex((item) => String(item.productId || item._id) === productId);
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: (Number(item.quantity) || 1) + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId,
          name: product.Name,
          price: Number(product.discountedPrice ?? product.Price ?? 0),
          image: getPrimaryProductImage(product)?.url || '',
          quantity: 1,
        },
      ];
    });
  };

  const handleOpenEditModal = (order) => {
    setEditingOrder(order);
    setEditItems(Array.isArray(order?.items) ? JSON.parse(JSON.stringify(order.items)) : []);
    setEditProductSearch('');
    setIsEditModalOpen(true);
    fetch('/api/admin/products/catalog?limit=40')
      .then((res) => res.json())
      .then((data) => {
        if (data?.products) setCatalog(data.products);
      })
      .catch(console.error);
  };

  const updateDraftItemQuantity = (productId, nextQuantity) => {
    const safeQuantity = Math.max(1, Number(nextQuantity) || 1);
    setDraftItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: safeQuantity }
          : item
      )
    );
  };

  const removeDraftItem = (productId) => {
    setDraftItems((current) => current.filter((item) => item.productId !== productId));
  };

  const addCustomItemToDraft = () => {
    const name = String(draftForm.customItemName || '').trim();
    const price = Number(draftForm.customItemPrice) || 0;
    if (!name) { toast.error('Enter a custom item name first.'); return; }
    const customId = `custom-${Date.now()}`;
    setDraftItems((current) => [
      ...current,
      { productId: customId, name, price, image: '', quantity: 1 },
    ]);
    updateDraftField('customItemName', '');
    updateDraftField('customItemPrice', '');
  };

  const handleDeleteOrder = (order) => {
    setDeleteConfirm({ id: order._id, orderId: order.orderId, label: order.customerName });
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await deleteOrderAction(deleteConfirm.id);
      if (res.success) {
        toast.success(`Order ${deleteConfirm.orderId} moved to Trash.`);
        setOrders((prev) => prev.filter((o) => o._id !== deleteConfirm.id));
        setTrashOrders((prev) => [{
          _id: deleteConfirm.id,
          orderId: deleteConfirm.orderId,
          customerName: deleteConfirm.label,
          customerPhone: '',
          totalAmount: 0,
          deletedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, ...prev]);
        setDeleteConfirm(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete order.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreOrder = async (id, orderId) => {
    const res = await restoreOrderAction(id);
    if (res.success) {
      toast.success(`Order ${orderId} restored.`);
      setTrashOrders((prev) => prev.filter((o) => o._id !== id));
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to restore order.');
    }
  };

  const handleHardDeleteOrder = async (id, orderId) => {
    if (hardDeletingId) return;
    setHardDeletingId(id);
    try {
      const res = await hardDeleteOrderAction(id);
      if (res.success) {
        toast.success(`Order ${orderId} permanently deleted.`);
        setTrashOrders((prev) => prev.filter((o) => o._id !== id));
        setConfirmHardDeleteOrder(null);
      } else {
        toast.error(res.error || 'Failed to delete order.');
      }
    } finally {
      setHardDeletingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptyingTrash(true);
    try {
      const res = await emptyTrashAction();
      if (res.success) {
        toast.success(`Trash emptied — ${res.deletedCount} order${res.deletedCount === 1 ? '' : 's'} permanently deleted.`);
        setTrashOrders([]);
        setEmptyTrashConfirm(false);
      } else {
        toast.error(res.error || 'Failed to empty trash.');
      }
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const validateSelectedOrders = (expectedStatus, actionLabel) => {
    const normalizedExpectedStatus = normalizeOrderStatus(expectedStatus);
    const selectedRecords = getSelectedOrders();

    if (selectedRecords.length === 0) {
      toast.error(`Select at least one order to ${actionLabel.toLowerCase()}.`);
      return null;
    }

    const invalidOrders = selectedRecords.filter(
      (order) => normalizeOrderStatus(order.status) !== normalizedExpectedStatus
    );

    if (invalidOrders.length > 0) {
      toast.error(`${actionLabel} only works for ${normalizedExpectedStatus.toLowerCase()} orders.`);
      return null;
    }

    return selectedRecords;
  };

  const moveSelectedOrdersToStatus = async (nextStatus, options = {}) => {
    const selectedRecords = getSelectedOrders();
    if (selectedRecords.length === 0) {
      toast.error('Select at least one order first.');
      return false;
    }

    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateOrderStatusAction({
        orderIds: selectedRecords.map((order) => order._id),
        nextStatus,
        allowedCurrentStatuses: options.allowedCurrentStatuses || [],
        logReason: options.logReason || '',
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update selected orders.');
        return false;
      }

      if (result.blockedOrders?.length > 0) {
        toast.error(`${result.blockedOrders.length} orders were skipped because their current status did not match this action.`);
      }

      if (result.updatedCount > 0) {
        const normalizedNextStatus = normalizeOrderStatus(nextStatus);
        setOrders((prev) =>
          prev.map((order) =>
            result.updatedOrderIds?.includes(order._id)
              ? { ...order, isDraft: false, status: normalizedNextStatus }
              : order
          )
        );
        toast.success(`${result.updatedCount} order${result.updatedCount === 1 ? '' : 's'} moved to ${normalizedNextStatus}.`);
      }

      setSelectedOrders([]);
      setBulkStatus('');
      router.refresh();
      return true;
    } finally {
      setIsBulkUpdating(false);
    }
  };



  const handleGenerateCourierSheet = async () => {
    const isDraftContext = statusFilter === DRAFT_TAB_ID;
    let ordersToExport = [];
    
    if (isDraftContext) {
      ordersToExport = getSelectedOrders();
      if (ordersToExport.length === 0) {
        toast.error("Select at least one draft order to generate courier sheet.");
        return;
      }
    } else {
      ordersToExport = validateSelectedOrders('Packed', 'Generate Courier Sheet');
      if (!ordersToExport) return;
    }

    setPendingWorkflowAction('courier');

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Sheet1');

      PAKISTAN_CITIES.forEach((city, index) => {
        mainSheet.getCell(index + 1, 20).value = city;
      });
      mainSheet.getColumn(20).hidden = true;

      const headers = [
        'ConsigneeName',
        'ConsigneeAddress',
        'ConsigneeEmail',
        'ConsigneeCellNo',
        'ConsigneeCity',
        'ItemType',
        'Quantity',
        'CODAmount',
        'Weight',
        'SpecialInstruction'
      ];

      mainSheet.getRow(1).values = headers;
      mainSheet.getRow(1).font = { bold: true };

      ordersToExport.forEach((order, index) => {
        let codAmount = 0;
        if (order.manualCodAmount !== undefined && order.manualCodAmount !== null && order.manualCodAmount !== '') {
          codAmount = Number(order.manualCodAmount);
        } else if (order.paymentStatus === 'Online') {
          codAmount = 0;
        } else {
          codAmount = getCodAmount(order);
        }

        const cleanAddress = [order.customerAddress, order.landmark]
          .filter(Boolean)
          .join(' - ')
          .replace(/[, \n\r]+/g, ' ')
          .trim();

        let city = (order.customerCity || '').trim();
        const exactMatch = PAKISTAN_CITIES.find((entry) => entry.trim().toLowerCase() === city.toLowerCase());
        city = exactMatch || 'KARACHI';

        const row = mainSheet.getRow(index + 2);
        const email = (order.customerEmail || 'customer@store.com').trim();

        row.values = [
          order.customerName,
          cleanAddress,
          email,
          order.customerPhone,
          city,
          order.itemType || 'Mix',
          String(order.orderQuantity || 1),
          codAmount,
          order.weight ?? 2,
          order.notes || ''
        ];

        row.getCell(5).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`$T$1:$T$${PAKISTAN_CITIES.length}`],
          showDropDown: true,
        };
      });

      mainSheet.columns.forEach((column, index) => {
        if (index < 10) column.width = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Courier_Sheet_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await moveSelectedOrdersToStatus('Shipped', {
        allowedCurrentStatuses: isDraftContext ? [] : ['Packed'],
        logReason: isDraftContext ? 'Courier sheet generated from Draft. Status moved to Shipped.' : 'Courier sheet generated. Status moved from Packed to Shipped.',
      });
    } finally {
      setPendingWorkflowAction('');
    }
  };

  const handleGenerateSourcingSlip = async ({ moveToNextStep = true } = {}) => {
    const ordersToExport = validateSelectedOrders('Order Confirmed', 'Generate Sourcing Slip');
    if (!ordersToExport) return;

    setPendingWorkflowAction(moveToNextStep ? 'sourcing-move' : 'sourcing-download');

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { sourcingRows, imageLookup, grandTotalCost } = await collectSourcingSlipData(ordersToExport);

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(28, 28, 539, 70, 18, 18, 'F');
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(18);
      doc.text('Daily Sourcing Slip', 44, 56);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated ${new Date().toLocaleString('en-PK')}`, 44, 76);
      doc.text(`${ordersToExport.length} order${ordersToExport.length === 1 ? '' : 's'} selected`, 44, 92);

      autoTable(doc, {
        startY: 118,
        head: [['Image', 'Item / Variant', 'Vendor List', 'Qty']],
        body: sourcingRows.map((row) => [
          '',
          row.itemName,
          row.vendors.length > 0
            ? row.vendors
                .map((vendor) => {
                  const vendorName = sanitizePdfText(vendor.name || 'Vendor');
                  const vendorProductName = sanitizePdfText(vendor.vendorProductName || '');
                  const priceLabel = vendor.vendorPrice != null
                    ? `PKR ${Number(vendor.vendorPrice).toLocaleString('en-PK')}`
                    : 'Price N/A';
                  return `${vendorName}${vendorProductName ? ` (${vendorProductName})` : ''} - ${priceLabel}`;
                })
                .join('\n')
            : '',
          String(row.totalQuantity || 0),
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 8,
          textColor: [30, 41, 59],
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 72, minCellHeight: 60 },
          1: { cellWidth: 170 },
          2: { cellWidth: 220 },
          3: { cellWidth: 45, halign: 'center' },
        },
        didDrawCell: (hookData) => {
          if (hookData.section !== 'body' || hookData.column.index !== 0) return;

          const imageKey = sourcingRows[hookData.row.index]?.image;
          const imageData = imageLookup.get(imageKey);

          if (imageData) {
            doc.addImage(imageData, hookData.cell.x + 8, hookData.cell.y + 6, 48, 48);
            return;
          }

          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(hookData.cell.x + 8, hookData.cell.y + 6, 48, 48, 8, 8);
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text('No image', hookData.cell.x + 16, hookData.cell.y + 34);
        },
      });

      const tableEndY = doc.lastAutoTable?.finalY || 118;
      doc.setDrawColor(226, 232, 240);
      doc.line(28, tableEndY + 18, 567, tableEndY + 18);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Grand Total Cost (lowest vendor price):', 332, tableEndY + 40);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`PKR ${grandTotalCost.toLocaleString('en-PK')}`, 567, tableEndY + 40, { align: 'right' });

      if (moveToNextStep) {
        const statusMoved = await moveSelectedOrdersToStatus('In Process', {
          allowedCurrentStatuses: ['Order Confirmed'],
          logReason: 'Sourcing slip generated. Status moved from Order Confirmed to In Process.',
        });

        if (!statusMoved) return;
      }

      doc.save(`Sourcing_Slip_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPendingWorkflowAction('');
    }
  };

  const handlePrintSourcingSlip = async ({ moveToNextStep = true } = {}) => {
    const ordersToPrint = validateSelectedOrders('Order Confirmed', 'Print Sourcing Slip');
    if (!ordersToPrint) return;

    const printWindow = openPrintWindow('Sourcing Slip');
    if (!printWindow) return;

    setPendingWorkflowAction(moveToNextStep ? 'sourcing-print-move' : 'sourcing-print');

    try {
      const { sourcingRows, imageLookup, grandTotalCost } = await collectSourcingSlipData(ordersToPrint);

      if (moveToNextStep) {
        const statusMoved = await moveSelectedOrdersToStatus('In Process', {
          allowedCurrentStatuses: ['Order Confirmed'],
          logReason: 'Sourcing slip printed. Status moved from Order Confirmed to In Process.',
        });

        if (!statusMoved) {
          printWindow.close();
          return;
        }
      }

      const content = renderSourcingPrintMarkup(ordersToPrint, sourcingRows, imageLookup, grandTotalCost);
      writePrintWindow(printWindow, 'Sourcing Slip', content);
    } catch (error) {
      printWindow.close();
      console.error(error);
      toast.error('Failed to open the sourcing print view.');
    } finally {
      setPendingWorkflowAction('');
    }
  };

  const handleGeneratePackingSlip = async ({ moveToNextStep = true } = {}) => {
    const selectedRecords = validateSelectedOrders('In Process', 'Generate Packing Slip');
    if (!selectedRecords) return;

    setPendingWorkflowAction(moveToNextStep ? 'packing-move' : 'packing-download');

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = 28;
      const sectionX = 42;
      const sectionWidth = pageWidth - 84;
      const bottomMargin = 24;
      const sectionGap = 14;

      selectedRecords.forEach((order, orderIndex) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const addressLabel = `Address: ${sanitizePdfText(
          [order.customerAddress, order.customerCity].filter(Boolean).join(', ') || 'N/A'
        )}`;
        const addressLines = doc.splitTextToSize(addressLabel, sectionWidth - 24);
        const addressHeight = Math.max(12, addressLines.slice(0, 2).length * 10);
        const estimatedSectionHeight = 70 + addressHeight + 24 + (items.length * 20);

        if (cursorY + estimatedSectionHeight > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = 28;
        }

        const sectionTop = cursorY;
        const tableStartY = sectionTop + 50 + addressHeight;

        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(1);
        doc.roundedRect(sectionX, sectionTop, sectionWidth, estimatedSectionHeight - 8, 8, 8, 'S');

        doc.setFillColor(15, 23, 42);
        doc.roundedRect(sectionX, sectionTop, sectionWidth, 24, 8, 8, 'F');
        doc.rect(sectionX, sectionTop + 12, sectionWidth, 12, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('PACKING SLIP', sectionX + 12, sectionTop + 16);
        doc.text(`${sanitizePdfText(order.orderId)}`, pageWidth - sectionX - 12, sectionTop + 16, { align: 'right' });

        doc.setTextColor(17, 24, 39);
        doc.setFontSize(8);
        doc.text(`Name: ${sanitizePdfText(order.customerName || 'N/A')}`, sectionX + 12, sectionTop + 38);
        doc.text(`Phone: ${sanitizePdfText(order.customerPhone || 'N/A')}`, sectionX + 210, sectionTop + 38);
        doc.text(addressLines.slice(0, 2), sectionX + 12, sectionTop + 50);

        autoTable(doc, {
          startY: tableStartY,
          head: [['Items', 'Qty']],
          body: items.map((item) => [
            sanitizePdfText(item.name || 'Unnamed item'),
            String(Number(item.quantity || 0)),
          ]),
          theme: 'grid',
          margin: { left: sectionX, right: sectionX },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 4,
            textColor: [30, 41, 59],
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255],
          },
          columnStyles: {
            0: { cellWidth: sectionWidth - 70 },
            1: { cellWidth: 70, halign: 'center' },
          },
        });

        const finalY = doc.lastAutoTable?.finalY || tableStartY;
        cursorY = finalY + sectionGap;
      });

      if (moveToNextStep) {
        const statusMoved = await moveSelectedOrdersToStatus('Packed', {
          allowedCurrentStatuses: ['In Process'],
          logReason: 'Packing slip generated. Status moved from In Process to Packed.',
        });

        if (!statusMoved) return;
      }

      doc.save(`Packing_Slips_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setPendingWorkflowAction('');
    }
  };

  const handlePrintPackingSlip = async ({ moveToNextStep = true } = {}) => {
    const selectedRecords = validateSelectedOrders('In Process', 'Print Packing Slip');
    if (!selectedRecords) return;

    const printWindow = openPrintWindow('Packing Slips');
    if (!printWindow) return;

    setPendingWorkflowAction(moveToNextStep ? 'packing-print-move' : 'packing-print');

    try {
      if (moveToNextStep) {
        const statusMoved = await moveSelectedOrdersToStatus('Packed', {
          allowedCurrentStatuses: ['In Process'],
          logReason: 'Packing slip printed. Status moved from In Process to Packed.',
        });

        if (!statusMoved) {
          printWindow.close();
          return;
        }
      }

      const content = renderPackingPrintMarkup(selectedRecords);
      writePrintWindow(printWindow, 'Packing Slips', content);
    } catch (error) {
      printWindow.close();
      console.error(error);
      toast.error('Failed to open the packing print view.');
    } finally {
      setPendingWorkflowAction('');
    }
  };

  const handleExportMonthlySales = async (format) => {
    // Filter orders by the selected date range for monthly report
    const reportOrders = orders;
    if (reportOrders.length === 0) {
      toast.error('No orders found in the current filtered range for report.');
      return;
    }

    const totalRevenue = reportOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const statusCounts = reportOrders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    if (format === 'excel') {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Monthly Sales');
      
      sheet.addRow(['Monthly Sales Report']);
      sheet.addRow([`Period: ${startDate || 'All'} to ${endDate || 'All'}`]);
      sheet.addRow([]);
      sheet.addRow(['Summary']);
      sheet.addRow(['Total Orders', reportOrders.length]);
      sheet.addRow(['Total Revenue', totalRevenue]);
      sheet.addRow([]);
      sheet.addRow(['Status Breakdown']);
      Object.entries(statusCounts).forEach(([status, count]) => {
        sheet.addRow([status, count]);
      });
      sheet.addRow([]);
      sheet.addRow(['Order Details']);
      sheet.addRow(['Date', 'Order ID', 'Customer', 'City', 'Amount', 'Status']);
      
      reportOrders.forEach(o => {
        sheet.addRow([
          new Date(o.createdAt).toLocaleDateString(),
          o.orderId,
          o.customerName,
          o.customerCity,
          o.totalAmount,
          o.status
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Monthly_Sales_Report_${new Date().toISOString().slice(0, 7)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Dynamically import jspdf to avoid SSR errors with Node-specific modules
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Monthly Sales Report', 14, 20);
      doc.setFontSize(12);
      doc.text(`Period: ${startDate || 'All'} to ${endDate || 'All'}`, 14, 30);
      
      doc.text('Summary', 14, 45);
      autoTable(doc, {
        body: [
          ['Total Orders', reportOrders.length],
          ['Total Revenue', `PKR ${totalRevenue.toLocaleString()}`],
        ],
        startY: 50,
        theme: 'grid',
      });

      doc.text('Status Breakdown', 14, doc.lastAutoTable?.finalY + 15 || 80);
      autoTable(doc, {
        body: Object.entries(statusCounts),
        startY: doc.lastAutoTable?.finalY + 20 || 85,
        theme: 'grid',
      });

      doc.text('Order details', 14, doc.lastAutoTable?.finalY + 15 || 120);
      autoTable(doc, {
        head: [['Date', 'ID', 'Customer', 'City', 'Amount', 'Status']],
        body: reportOrders.map(o => [
          new Date(o.createdAt).toLocaleDateString(),
          o.orderId,
          o.customerName,
          o.customerCity,
          o.totalAmount,
          o.status
        ]),
        startY: doc.lastAutoTable?.finalY + 20 || 125,
      });

      doc.save(`Monthly_Sales_Report_${new Date().toISOString().slice(0, 7)}.pdf`);
    }
  };

  const handleQuickUpdate = async (id) => {
    setIsQuickUpdating(true);
    const res = await updateOrderAction(id, { 
      status: quickStatus, 
      trackingNumber: quickTracking,
      courierName: editingOrder?.courierName || ''
    });
    
    if (res.success) {
      toast.success('Order updated');
      setQuickActionOrder(null);
      setOrders((prev) => prev.map((order) => (
        order._id === id ? { ...order, isDraft: false, status: normalizeOrderStatus(quickStatus), trackingNumber: quickTracking, courierName: editingOrder?.courierName || '' } : order
      )));
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to update order');
    }
    setIsQuickUpdating(false);
  };

  const handleFullUpdate = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsUpdating(true);
    // Collect updates from form fields
    const form = e.target;
    const updates = {
      customerName: form.customerName.value,
      customerPhone: form.customerPhone.value,
      customerAddress: form.customerAddress.value,
      customerCity: editingOrder.customerCity,
      notes: form.notes?.value || '',
      items: editItems,
      weight: form.weight.value,
      manualCodAmount: form.manualCodAmount.value,
    };
    const res = await updateOrderAction(editingOrder._id, updates);
    if (res.success) {
      toast.success('Order details updated');
      setIsEditModalOpen(false);
      setEditingOrder(null);
      setEditItems([]);
      setOrders((prev) => prev.map((order) => (
        order._id === editingOrder._id
          ? { 
              ...order, 
              ...updates, 
              items: editItems,
              totalAmount: editItems.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 1)), 0),
              customerCity: editingOrder.customerCity 
            }
          : order
      )));
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to update order');
    }
    setIsUpdating(false);
  };

  const fetchCustomerSuggestions = async (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      setCustomerSuggestionsOpen(false);
      return;
    }
    setIsSearchingCustomers(true);
    try {
      const res = await fetch(`/api/admin/manual-customers/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerSuggestions(data.customers || []);
        setCustomerSuggestionsOpen(true);
      }
    } catch (err) {
      console.error('Failed to search customers:', err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const onCustomerNameChange = (val) => {
    updateDraftField('customerName', val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCustomerSuggestions(val);
    }, 300);
  };

  const selectCustomer = (customer) => {
    setDraftForm(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone || prev.customerPhone,
      customerAddress: customer.address || prev.customerAddress,
      customerCity: customer.city || prev.customerCity
    }));
    setCustomerSuggestionsOpen(false);
  };

  const handleCreateDraftOrder = async (event) => {
    event.preventDefault();

    if (!/^03\d{9}$/.test(draftForm.customerPhone)) {
      toast.error('Phone number must be exactly 11 digits starting with 03 (e.g., 03xxxxxxxxx)');
      return;
    }

    if (draftItems.length === 0) {
      toast.error('Add at least one item before creating the order.');
      return;
    }

    setIsCreatingDraft(true);
    try {
      const result = await createDraftOrderAction({
        customerName: draftForm.customerName,
        customerPhone: draftForm.customerPhone,
        customerAddress: draftForm.customerAddress,
        customerCity: draftForm.customerCity,
        landmark: draftForm.landmark,
        sourceTag: draftForm.sourceTag,
        itemType: draftForm.itemType,
        weight: draftForm.weight,
        notes: draftForm.notes,
        manualCodAmount: draftForm.manualCodAmount,
        createLinkedInvoice,
        items: draftItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.name,
          price: item.price,
        })),
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create draft order.');
        return;
      }

      toast.success('Draft order created.');
      setIsCreateModalOpen(false);
      resetDraftComposer();
      setStatusFilter(DRAFT_TAB_ID);
      navigate({ status: DRAFT_TAB_ID, page: null });
      router.refresh();
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const hasActiveFilters = searchQuery || statusFilter !== DEFAULT_ADMIN_FILTER_STATUS || startDate || endDate;
  const canApplyFilters = Boolean(searchQuery.trim() || startDate || endDate);
  const isFilterModified = searchQuery !== (initialSearchQuery || '') || startDate !== (initialStartDate || '') || endDate !== (initialEndDate || '');
  const hasAppliedFilters = Boolean(initialSearchQuery || initialStartDate || initialEndDate);
  const appliedFilters = [
    statusFilter !== DEFAULT_ADMIN_FILTER_STATUS ? `Status: ${statusFilter === 'all' ? 'All' : statusFilter === DRAFT_TAB_ID ? 'Draft' : statusFilter === TRASH_TAB_ID ? 'Trash' : statusFilter}` : null,
    initialSearchQuery ? `Search: ${initialSearchQuery}` : null,
    initialStartDate || initialEndDate
      ? `Date: ${initialStartDate || 'Any'} - ${initialEndDate || 'Any'}`
      : null,
  ].filter(Boolean);
  const isTrashView = statusFilter === TRASH_TAB_ID;
  const showNocColumns = ['all', 'Shipped', 'Out For Delivery', 'Delivered', 'Returned'].includes(statusFilter);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-xl">Orders</h2>
        <div className="flex items-center gap-2">
          <Link href="/admin/invoices">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-foreground hover:bg-muted"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Invoices Management</span>
              <span className="sm:hidden">Invoices</span>
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="admin-cta-button rounded-md h-8 px-3 text-xs gap-1.5 font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Create Order</span>
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs / Select (Responsive) */}
      <div className="hidden md:flex flex-col gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: DRAFT_TAB_ID, label: `Draft (${summary.draftCount || 0})` },
            { id: 'Order Confirmed', label: `Order Confirmed (${summary.orderConfirmedCount})` },
            { id: 'In Process', label: `In Process (${summary.inProcessCount})` },
            { id: 'Packed', label: `Packed (${summary.packedCount || 0})` },
            { id: 'Shipped', label: `Shipped (${summary.shippedCount || 0})` },
            { id: 'Out For Delivery', label: `Out For Delivery (${summary.outForDeliveryCount || 0})` },
            { id: 'Delivered', label: `Delivered (${summary.deliveredCount})` },
            { id: 'Returned', label: `Returned (${summary.returnedCount})` },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={statusFilter === tab.id ? "default" : "ghost"}
              size="sm"
              disabled={isPending}
              onClick={() => {
                setStatusFilter(tab.id);
                navigate({ status: tab.id, page: null });
              }}
              className={cn(
                "h-8.5 rounded-lg px-3.5 text-xs font-semibold transition-all md:h-8.5 md:text-[12.5px] cursor-pointer",
                statusFilter === tab.id
                  ? "shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {isPending && statusFilter === tab.id ? <Spinner data-icon="inline-start" className="size-3.5" /> : null}
              {tab.label}
            </Button>
          ))}
          {/* Trash tab — separated with a divider */}
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            variant={statusFilter === TRASH_TAB_ID ? 'destructive' : 'ghost'}
            size="sm"
            disabled={isPending}
            onClick={() => {
              setStatusFilter(TRASH_TAB_ID);
              navigate({ status: TRASH_TAB_ID, page: null });
            }}
            className={cn(
              'h-8.5 rounded-lg px-3.5 text-xs font-semibold transition-all md:h-8.5 md:text-[12.5px] cursor-pointer',
              statusFilter !== TRASH_TAB_ID && 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
            )}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Trash ({summary.trashCount || trashOrders.length})
          </Button>
        </div>

        {/* Delivered Lifecycle Sub-Tabs: Pending Remittance vs Paid vs All */}
        {statusFilter === 'Delivered' && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Payment Status:</span>
            {[
              { id: 'pending', label: `Pending Remittance (${summary.deliveredPendingCount ?? Math.max(0, summary.deliveredCount - (summary.deliveredPaidCount || 0))})` },
              { id: 'paid', label: `Paid Orders (${summary.deliveredPaidCount || 0})` },
              { id: 'all', label: `All Delivered (${summary.deliveredCount || 0})` },
            ].map((subTab) => {
              const isActive = (paymentFilter || 'all') === subTab.id;
              return (
                <Button
                  key={subTab.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'secondary' : 'ghost'}
                  disabled={isPending}
                  onClick={() => {
                    setPaymentFilter(subTab.id);
                    navigate({ status: 'Delivered', paymentFilter: subTab.id, page: null });
                  }}
                  className={cn(
                    'h-6.5 text-[11px] px-2.5 rounded-full font-medium transition-all',
                    isActive
                      ? 'bg-muted font-bold text-foreground border border-border/80 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {subTab.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Status Row */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <Select
            value={statusFilter}
            disabled={isPending}
            onValueChange={(val) => {
              setStatusFilter(val);
              navigate({ status: val, page: null });
            }}
          >
            <SelectTrigger className="w-full h-9 rounded-xl bg-background border-border text-xs font-semibold shadow-none">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {[
                { id: 'all', label: 'All' },
                { id: DRAFT_TAB_ID, label: `Draft (${summary.draftCount || 0})` },
                { id: 'Order Confirmed', label: `Order Confirmed (${summary.orderConfirmedCount})` },
                { id: 'In Process', label: `In Process (${summary.inProcessCount})` },
                { id: 'Packed', label: `Packed (${summary.packedCount || 0})` },
                { id: 'Shipped', label: `Shipped (${summary.shippedCount || 0})` },
                { id: 'Out For Delivery', label: `Out For Delivery (${summary.outForDeliveryCount || 0})` },
                { id: 'Delivered', label: `Delivered (${summary.deliveredCount})` },
                { id: 'Returned', label: `Returned (${summary.returnedCount})` },
                { id: TRASH_TAB_ID, label: `Trash (${summary.trashCount || trashOrders.length})` },
              ].map((tab) => (
                <SelectItem key={tab.id} value={tab.id} className="text-xs">
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Delivered Sub-Tabs */}
        {statusFilter === 'Delivered' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: 'pending', label: `Pending Remittance (${summary.deliveredPendingCount ?? Math.max(0, summary.deliveredCount - (summary.deliveredPaidCount || 0))})` },
              { id: 'paid', label: `Paid (${summary.deliveredPaidCount || 0})` },
              { id: 'all', label: `All (${summary.deliveredCount || 0})` },
            ].map((subTab) => {
              const isActive = (paymentFilter || 'all') === subTab.id;
              return (
                <Button
                  key={subTab.id}
                  type="button"
                  size="sm"
                  variant={isActive ? 'secondary' : 'ghost'}
                  disabled={isPending}
                  onClick={() => {
                    setPaymentFilter(subTab.id);
                    navigate({ status: 'Delivered', paymentFilter: subTab.id, page: null });
                  }}
                  className={cn(
                    'h-6.5 text-[11px] px-2.5 rounded-full font-medium shrink-0',
                    isActive ? 'bg-muted font-bold text-foreground border border-border' : 'text-muted-foreground'
                  )}
                >
                  {subTab.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Trash Panel ── */}
      {isTrashView && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-4" />
              <p className="text-[13px] font-semibold">Trash</p>
              <span className="text-[11px] text-destructive/70">— Orders are auto-purged after 50 days</span>
            </div>
            {trashOrders.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setEmptyTrashConfirm(true)}
                className="admin-cta-button text-[12px]"
              >
                <Trash2 data-icon="inline-start" />
                Empty Trash ({trashOrders.length})
              </Button>
            )}
          </div>

          {trashOrders.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
              <Trash2 className="mx-auto mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Trash is empty</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Deleted orders will appear here for 50 days.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Deleted</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trashOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 text-[13px] font-semibold tabular-nums text-foreground">{o.orderId}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-[13px] font-medium text-foreground">{o.customerName}</p>
                        {o.isDraft && <span className="text-[10px] text-muted-foreground">Draft</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-foreground">{formatPrice(o.totalAmount)}</td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {o.deletedAt ? formatDistanceToNow(new Date(o.deletedAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="admin-cta-button h-7 text-[11px]"
                            onClick={() => handleRestoreOrder(o._id, o.orderId)}
                          >
                            <RotateCcw className="mr-1 size-3" />
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="admin-cta-button h-7 text-[11px] text-destructive hover:text-destructive"
                            disabled={hardDeletingId === o._id}
                            onClick={() => setConfirmHardDeleteOrder(o)}
                          >
                            <Trash2 className="mr-1 size-3" />
                            {hardDeletingId === o._id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hard Delete Single Order Confirm Dialog */}
      <Dialog open={!!confirmHardDeleteOrder} onOpenChange={(open) => { if (!open) setConfirmHardDeleteOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" />
              Permanently Delete Order?
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              This will permanently remove order <strong>{confirmHardDeleteOrder?.orderId}</strong> from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setConfirmHardDeleteOrder(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={hardDeletingId === confirmHardDeleteOrder?._id}
              onClick={() => confirmHardDeleteOrder && handleHardDeleteOrder(confirmHardDeleteOrder._id, confirmHardDeleteOrder.orderId)}
              className="min-w-[120px]"
            >
              {hardDeletingId === confirmHardDeleteOrder?._id ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {hardDeletingId === confirmHardDeleteOrder?._id ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Confirm Dialog */}
      <Dialog open={emptyTrashConfirm} onOpenChange={setEmptyTrashConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" />
              Empty Trash?
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Are you sure you want to permanently delete all <strong>{trashOrders.length}</strong> orders in the trash? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setEmptyTrashConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isEmptyingTrash}
              onClick={handleEmptyTrash}
              className="min-w-[120px]"
            >
              {isEmptyingTrash ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {isEmptyingTrash ? 'Deleting...' : 'Empty Trash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Move to Trash Confirm Dialog */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm font-bold">
              <AlertTriangle className="size-4" />
              Move {selectedOrders.length} Order(s) to Trash?
            </DialogTitle>
            <DialogDescription className="text-[13px] pt-1 text-muted-foreground">
              Are you sure you want to move the <strong className="text-foreground">{selectedOrders.length}</strong> selected order(s) to Trash? You can restore them anytime within 50 days from the Trash tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5 sm:gap-0 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setBulkDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isBulkDeleting}
              onClick={handleConfirmBulkDelete}
              className="min-w-[120px]"
            >
              {isBulkDeleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {isBulkDeleting ? 'Moving...' : `Move ${selectedOrders.length} to Trash`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Filter Bar & Actions ── */}
      {selectedOrders.length > 0 ? (
        /* Floating / Selected Mode Action Bar */
        <div className="admin-filter-shell flex flex-wrap items-center justify-between gap-2.5 w-full bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
              {selectedOrders.length} selected
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrders([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Selector Dropdown */}
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-7.5 w-[140px] text-xs bg-background rounded-lg border-border/80">
                <SelectValue placeholder="Move to status" />
              </SelectTrigger>
              <SelectContent>
                {BULK_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Apply Status Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => moveSelectedOrdersToStatus(bulkStatus)}
              disabled={!bulkStatus || isBulkUpdating || pendingWorkflowAction !== ''}
              className="h-7.5 px-2.5 text-xs font-medium"
            >
              {isBulkUpdating ? <Spinner data-icon="inline-start" /> : <PackageCheck data-icon="inline-start" />}
              Move
            </Button>

            {/* Contextual Workflow Action Buttons for Selected Orders */}
            {statusFilter === 'Order Confirmed' && (
              <Button
                type="button"
                size="sm"
                onClick={() => handlePrintSourcingSlip({ moveToNextStep: true })}
                disabled={pendingWorkflowAction !== '' || isBulkUpdating}
                className="h-7.5 px-2.5 text-xs bg-yellow-200 text-yellow-900 hover:bg-yellow-300 rounded-lg font-medium shadow-xs"
              >
                {pendingWorkflowAction === 'sourcing-print-move' ? <Spinner data-icon="inline-start" /> : <Printer data-icon="inline-start" />}
                Print & Move
              </Button>
            )}

            {statusFilter === 'In Process' && (
              <Button
                type="button"
                size="sm"
                onClick={() => handlePrintPackingSlip({ moveToNextStep: true })}
                disabled={pendingWorkflowAction !== '' || isBulkUpdating}
                className="h-7.5 px-2.5 text-xs bg-yellow-200 text-yellow-900 hover:bg-yellow-300 rounded-lg font-medium shadow-xs"
              >
                {pendingWorkflowAction === 'packing-print-move' ? <Spinner data-icon="inline-start" /> : <Printer data-icon="inline-start" />}
                Print & Move
              </Button>
            )}

            {(statusFilter === 'Packed' || statusFilter === DRAFT_TAB_ID || statusFilter === 'all') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateCourierSheet}
                disabled={pendingWorkflowAction !== '' || isBulkUpdating}
                className="h-7.5 px-2.5 text-xs font-medium gap-1.5 rounded-lg shadow-xs cursor-pointer"
              >
                {pendingWorkflowAction === 'courier' ? <Spinner data-icon="inline-start" className="size-3" /> : <Download className="size-3.5" />}
                Courier Sheet
              </Button>
            )}

            {(statusFilter === 'Packed' || statusFilter === DRAFT_TAB_ID) && (
              <Button
                type="button"
                size="sm"
                onClick={() => setNocBookingOpen(true)}
                disabled={isBookingNoc}
                className="h-7.5 px-2.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs"
              >
                <Truck className="size-3.5 mr-1" />
                Send to NOC
              </Button>
            )}

            {(statusFilter === 'Packed' || statusFilter === DRAFT_TAB_ID || statusFilter === 'Shipped') && (
              <Button
                type="button"
                size="sm"
                onClick={handlePrintSelectedNocSlips}
                className="h-7.5 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
              >
                <Printer className="size-3.5 mr-1" />
                Print Slips
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => handleSyncNocStatus(selectedOrders)}
              disabled={isBulkSyncingNoc}
              className="h-7.5 px-2.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
            >
              {isBulkSyncingNoc ? <Spinner data-icon="inline-start" /> : <RotateCcw className="size-3.5" />}
              Sync NOC Status
            </Button>

            {/* Delete / Move to Trash Button */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              disabled={isBulkDeleting || isBulkUpdating || pendingWorkflowAction !== ''}
              className="h-7.5 px-2.5 text-xs gap-1.5 rounded-lg shadow-xs cursor-pointer"
            >
              {isBulkDeleting ? <Spinner data-icon="inline-start" className="size-3" /> : <Trash2 className="size-3.5" />}
              Move to Trash
            </Button>
          </div>
        </div>
      ) : (
        /* Standard Filters & Actions Bar (Clean, Responsive Grid) */
        <div className="admin-filter-shell flex flex-col gap-2.5 w-full md:flex-row md:items-center md:justify-between">
          <form
            className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 flex-1 min-w-0"
            onSubmit={(event) => {
              event.preventDefault();
              navigate({
                search: searchQuery.trim() || null,
                startDate: startDate || null,
                endDate: endDate || null,
                page: null,
              });
            }}
          >
            {/* Date Filters Row (Left side) */}
            <div className="flex items-center gap-2">
              <Select value={getQuickDateValue()} onValueChange={handleQuickDateFilter}>
                <SelectTrigger className="h-8.5 flex-1 md:w-[130px] rounded-lg border-border bg-background text-xs shadow-none">
                  <SelectValue placeholder="Date Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="year2026">Year 2026</SelectItem>
                  <SelectItem value="year2025">Year 2025</SelectItem>
                  <SelectItem value="custom" className="hidden">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={Boolean(isDatePopoverOpen)} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" type="button" className="size-8.5 shrink-0 rounded-lg border-border bg-background shadow-none relative cursor-pointer" title="Custom Date Range">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {(startDate || endDate) && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-4 rounded-xl shadow-lg border-border">
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-foreground">Filter by Custom Date Range</p>
                    <div className="flex items-center gap-2">
                      <Field>
                        <FieldLabel htmlFor="orders-start-date" className="sr-only">From date</FieldLabel>
                        <Input
                          id="orders-start-date"
                          type="date"
                          className="h-8 min-w-[120px] text-xs"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </Field>
                      <span className="text-xs text-muted-foreground">to</span>
                      <Field>
                        <FieldLabel htmlFor="orders-end-date" className="sr-only">To date</FieldLabel>
                        <Input
                          id="orders-end-date"
                          type="date"
                          className="h-8 min-w-[120px] text-xs"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {(startDate || endDate) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setIsDatePopoverOpen(false);
                            navigate({
                              search: searchQuery.trim() || null,
                              startDate: null,
                              endDate: null,
                              allDates: '1',
                              page: null,
                            });
                          }}
                          className="h-7 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          Reset
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setIsDatePopoverOpen(false);
                          navigate({
                            search: searchQuery.trim() || null,
                            startDate: startDate || null,
                            endDate: endDate || null,
                            page: null,
                          });
                        }}
                        className="h-7 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md cursor-pointer"
                      >
                        Apply Date
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Input (Right side) */}
            <Field className="w-full md:max-w-xs lg:max-w-sm">
              <FieldLabel className="sr-only">Search orders</FieldLabel>
              <div className="relative flex items-center w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" data-icon />
                <Input
                  placeholder="Search order ID, customer, phone..."
                  className="h-8.5 rounded-lg border-border bg-background pl-9 pr-[68px] text-xs shadow-none w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                  {initialSearchQuery && searchQuery === initialSearchQuery ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        navigate({ search: null, page: null });
                      }}
                      className="h-6.5 px-2.5 text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 rounded-md gap-1 shadow-xs cursor-pointer"
                      title="Clear search"
                    >
                      <X className="size-3" />
                      Clear
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!canApplyFilters}
                      className="h-6.5 px-2.5 text-[10px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md cursor-pointer"
                    >
                      Search
                    </Button>
                  )}
                </div>
              </div>
            </Field>
          </form>

          {/* Action Buttons Row (Sync NOC, Reports, etc.) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 md:border-0 md:pt-0 shrink-0">
            {(statusFilter === 'Shipped' || statusFilter === 'all' || statusFilter === 'In Transit' || statusFilter === 'Out for Delivery' || statusFilter === 'Out For Delivery' || statusFilter === 'Returned') ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const targetOrders = displayOrders
                      .filter((o) => o.nocParcelNo || o.trackingNumber || o.nocThirdPartyNo)
                      .map((o) => o._id);
                    if (targetOrders.length === 0) {
                      toast.error('No orders with tracking numbers found to sync.');
                      return;
                    }
                    handleSyncNocStatus(targetOrders);
                  }}
                  disabled={isBulkSyncingNoc}
                  className="h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer text-foreground hover:bg-muted"
                >
                  {isBulkSyncingNoc ? <Spinner data-icon="inline-start" className="size-3" /> : <RotateCcw className="size-3.5 text-muted-foreground" />}
                  <span>{isBulkSyncingNoc ? 'Syncing...' : 'Sync NOC Status'}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSyncSheetModalOpen(true)}
                  className="h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer text-foreground hover:bg-muted"
                  title="Upload NOC Excel file to auto-sync 3rd Party CNs and Courier Partners"
                >
                  <Upload className="size-3.5 text-muted-foreground" />
                  <span>Sync NOC Sheet</span>
                </Button>
              </>
            ) : null}

            {statusFilter === 'all' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 text-foreground hover:bg-muted cursor-pointer">
                    <Zap className="size-3.5 text-muted-foreground" />
                    <span>Reports</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 p-1.5 rounded-xl shadow-lg border-border" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Courier Exports</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="gap-2 text-xs font-medium cursor-pointer"
                      onClick={() => handleGenerateCourierSheet()}
                    >
                      <Download className="size-3.5" />
                      Courier Sheet (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Sales</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="gap-2 text-xs font-medium cursor-pointer"
                      onClick={() => handleExportMonthlySales('excel')}
                    >
                      <Download className="size-3.5" />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-xs font-medium text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => handleExportMonthlySales('pdf')}
                    >
                      <Download className="size-3.5" />
                      PDF (.pdf)
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      )}


      {/* ── Desktop Table ── */}
      {isPending ? <OrdersTablePendingSkeleton showNocColumns={showNocColumns} enableSecondaryNoc={enableSecondaryNoc} /> : (
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-8 px-2 py-2.5 text-center">
                      <Checkbox 
                        checked={isAllPaginatedSelected} 
                        onCheckedChange={handleSelectAll} 
                        aria-label="Select all on page"
                        className="size-4"
                      />
                    </th>
                    <th className="px-2.5 py-2.5 whitespace-nowrap">Order</th>
                    <th className="px-2.5 py-2.5 whitespace-nowrap">Customer</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">City</th>
                    <th className="px-2.5 py-2.5 whitespace-nowrap">Date</th>
                    <th className="px-2 py-2.5 whitespace-nowrap">Payment</th>
                    {showNocColumns && <th className="px-2.5 py-2.5 whitespace-nowrap">Tracking / Courier</th>}
                    {showNocColumns && (
                      <th className="px-2.5 py-2.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span>NOC Status</span>
                          {isBulkSyncingNoc && (
                            <Spinner className="size-3 text-primary animate-spin" title="Updating statuses in background..." />
                          )}
                        </div>
                      </th>
                    )}
                    <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Amount</th>
                    <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Status</th>
                    <th className="w-16 px-2 py-2.5 text-right whitespace-nowrap" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-[13px]">
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={showNocColumns ? (enableSecondaryNoc ? 14 : 13) : 9} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Image
                            src="/undraw_relaxing-outdoors_s653.svg"
                            alt="No orders found"
                            width={160}
                            height={120}
                            className="mb-3 h-auto w-36 object-contain opacity-90"
                          />
                          <p className="text-base font-semibold text-foreground">No orders found</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
                          {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters} className="admin-cta-button mt-3 rounded-md">
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((order) => {
                      if (!order) return null;
                      const has3rdParty = order.nocThirdPartyNo && String(order.nocThirdPartyNo).trim() !== '' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'N/A' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'NA';
                      const displayTracking = has3rdParty ? String(order.nocThirdPartyNo).trim() : (order.nocParcelNo || order.trackingNumber || '');
                      const rawCourier = order.courierName || (order.trackingNumber ? 'NOC' : '—');
                      const courierToDisplay = rawCourier;
                      const statusTimeDisplay = (() => {
                        if (order.nocStatusTime && String(order.nocStatusTime).trim() !== '') {
                          return String(order.nocStatusTime).trim();
                        }
                        if (order.courierBookingDate) {
                          return formatFullDateTime(order.courierBookingDate);
                        }
                        return '—';
                      })();

                      return (
                        <tr key={order._id} className="transition-colors hover:bg-muted/30">
                          <td className="w-8 px-2 py-2 text-center">
                            <Checkbox 
                              checked={selectedOrders.includes(order._id)} 
                              onCheckedChange={(checked) => handleSelectOne(checked, order._id)} 
                              aria-label={`Select order ${order.orderId}`}
                              className="size-4"
                            />
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {(() => {
                                const origin = getOrderOriginInfo(order);
                                return origin.isAdmin ? (
                                  <UserCog className="size-3.5 text-foreground shrink-0 select-none" title={origin.tooltip} />
                                ) : (
                                  <Globe className="size-3.5 text-foreground shrink-0 select-none" title={origin.tooltip} />
                                );
                              })()}
                              <Link href={`/admin/orders/${order._id}`} className="text-[13px] font-bold tabular-nums text-foreground hover:underline whitespace-nowrap">
                                {order.orderId}
                              </Link>
                              {isNewOrder(order.createdAt) && (
                                <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[8.5px] font-bold uppercase tracking-wider shrink-0">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <div className="flex flex-col whitespace-nowrap">
                              <span className="text-[13px] font-semibold text-foreground max-w-[130px] truncate" title={order.customerName}>{order.customerName}</span>
                              <span className="text-[11.5px] font-medium text-muted-foreground">{order.customerPhone}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className="text-[12.5px] font-semibold text-foreground whitespace-nowrap">
                              {order.customerCity || '—'}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <div className="flex flex-col whitespace-nowrap" title={formatFullDateTime(order.createdAt)}>
                              <span className="text-[12.5px] font-semibold text-foreground whitespace-nowrap">
                                {formatSmartTimeAgo(order.createdAt)}
                              </span>
                              <span className="text-[10.5px] font-medium text-muted-foreground whitespace-nowrap">
                                {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-[12px] font-semibold text-foreground whitespace-nowrap">{order.paymentStatus || 'COD'}</td>

                          {/* 1. Combined Tracking & Courier Column (Only on Post-Pack tabs) */}
                          {showNocColumns && (
                            <td className="px-2.5 py-2 whitespace-nowrap">
                              {displayTracking ? (
                                <div className="flex flex-col whitespace-nowrap">
                                  <span className="font-mono text-[12.5px] font-bold text-foreground whitespace-nowrap" title={has3rdParty ? `3rd Party No: ${displayTracking}` : `Parcel No: ${displayTracking}`}>
                                    {displayTracking}
                                  </span>
                                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                    {courierToDisplay}{enableSecondaryNoc && order.nocAccountId === 'portal_2' ? ' • Aam Samaan' : ''}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">—</span>
                              )}
                            </td>
                          )}

                          {/* 2. Combined NOC Status & Time Column (Only on Post-Pack tabs) */}
                          {showNocColumns && (
                            <td className="px-2.5 py-2 whitespace-nowrap">
                              {(order.trackingNumber || has3rdParty) ? (
                                <div className="flex flex-col whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setNocTrackingOrder(order)}
                                    title={`Click to view tracking timeline${order.nocRemarks ? ` (${order.nocRemarks})` : ''}`}
                                    className="text-[12px] font-semibold text-foreground hover:text-primary hover:underline cursor-pointer text-left whitespace-nowrap"
                                  >
                                    {(() => {
                                      const raw = order.nocStatus || '';
                                      if (raw && !raw.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
                                        return raw;
                                      }
                                      return order.status === 'Delivered' ? 'Delivered' : (order.status === 'Out For Delivery' ? 'INTRANSIT' : 'Booked');
                                    })()}
                                  </button>
                                  {(() => {
                                    const effectiveTime = getEffectiveNocStatusTime(order);
                                    if (!effectiveTime) return null;
                                    return (
                                      <span className="text-[10.5px] font-medium text-muted-foreground whitespace-nowrap">
                                        {formatSmartTimeAgo(effectiveTime)}
                                      </span>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">—</span>
                              )}
                            </td>
                          )}

                          {/* 3. Combined Amount Column */}
                          <td className="px-2.5 py-2 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end whitespace-nowrap">
                              <span className="text-[13px] font-bold tabular-nums text-foreground whitespace-nowrap">
                                {formatPrice(getCodAmount(order))}
                              </span>
                              {order.manualCodAmount ? (
                                <span className="text-[10px] tabular-nums font-medium text-muted-foreground whitespace-nowrap">
                                  Tot: {formatPrice(order.totalAmount)}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* 4. Store Status Badge */}
                          <td className="px-2.5 py-2 text-center whitespace-nowrap">
                            <Badge
                              variant={order.isDraft ? 'outline' : (statusVariant[order.status] || 'secondary')}
                              className={cn('text-[11px] px-2 py-0.5 whitespace-nowrap font-bold', order.isDraft ? 'border-slate-300 bg-slate-50 text-slate-700' : getStatusBadgeClass(order.status))}
                            >
                              {getOrderDisplayStatus(order)}
                            </Badge>
                          </td>
                          <td className="w-16 px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <OrderQuickViewDialog
                                order={order}
                                triggerLabel="View"
                                triggerSize="sm"
                                triggerClassName="h-6.5 px-2 text-[11.5px] rounded-md border border-border shadow-xs font-semibold"
                              />
                              {(() => {
                                const isShippedPhase = ['Shipped', 'Out For Delivery', 'Delivered', 'Returned', 'Cancelled'].includes(normalizeOrderStatus(order.status));
                                return (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="size-6.5 text-muted-foreground cursor-pointer">
                                        <MoreHorizontal className="size-3.5" />
                                        <span className="sr-only">Order actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-38">
                                      <DropdownMenuGroup>
                                        {!isShippedPhase && (
                                          <DropdownMenuItem
                                            onClick={() => handleOpenEditModal(order)}
                                            className="cursor-pointer text-[12px]"
                                          >
                                            <Edit className="size-3.5 mr-2" />
                                            Edit Order
                                          </DropdownMenuItem>
                                        )}
                                        {(order.trackingNumber || order.nocParcelNo || order.nocThirdPartyNo) && (
                                          <DropdownMenuItem
                                            onClick={() => setNocTrackingOrder(order)}
                                            className="cursor-pointer text-[12px]"
                                          >
                                            <Truck className="size-3.5 mr-2 text-primary" />
                                            Track NOC
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuGroup>
                                      {(!isShippedPhase || order.trackingNumber || order.nocParcelNo || order.nocThirdPartyNo) && <DropdownMenuSeparator />}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => handleDeleteOrder(order)}
                                        className="cursor-pointer text-destructive focus:text-destructive text-[12px]"
                                      >
                                        <Trash2 className="size-3.5 mr-2" />
                                        Move to Trash
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
        </div>
      </div>
      )}

      {/* ── Mobile Cards ── */}
      {isPending ? <OrdersMobilePendingSkeleton /> : (
      <div className="flex flex-col md:hidden">
        {displayOrders.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-y border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isAllPaginatedSelected} 
                onCheckedChange={handleSelectAll} 
                aria-label="Select all on page"
              />
              <p className="text-[12px] font-medium text-muted-foreground cursor-pointer" onClick={() => handleSelectAll(!isAllPaginatedSelected)}>Select all on page</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrders.length > 0 && (
                <span className="text-[11px] font-semibold text-foreground">{selectedOrders.length} selected</span>
              )}
              {(statusFilter === 'Packed' || statusFilter === DRAFT_TAB_ID) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleGenerateCourierSheet}
                  disabled={selectedOrders.length === 0 || pendingWorkflowAction !== '' || isBulkUpdating}
                  className="admin-cta-button h-7 text-[11px] px-2"
                >
                  {pendingWorkflowAction === 'courier' ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                  Courier Sheet
                </Button>
              )}
            </div>
          </div>
        )}

        {displayOrders.length === 0 ? (
          <div className="border-y border-border bg-card px-3 py-8 text-center flex flex-col items-center justify-center">
            <Image
              src="/undraw_relaxing-outdoors_s653.svg"
              alt="No orders found"
              width={140}
              height={105}
              className="mb-3 h-auto w-32 object-contain opacity-90"
            />
            <p className="text-sm font-medium text-foreground">No orders found</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Try adjusting your search or filters.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="admin-cta-button mt-3">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border border-b border-border bg-card">
            {displayOrders.map((order) => {
              if (!order) return null;

              return (
                <div key={order._id} className="flex items-start gap-2.5 p-2.5 hover:bg-muted/30 transition-colors">
                  <Checkbox
                    checked={selectedOrders.includes(order._id)}
                    onCheckedChange={(checked) => handleSelectOne(checked, order._id)}
                    aria-label={`Select order ${order.orderId}`}
                    className="shrink-0 size-3.5 rounded-sm mt-0.5"
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 mt-[1px] flex-wrap">
                        {(() => {
                          const origin = getOrderOriginInfo(order);
                          return origin.isAdmin ? (
                            <UserCog className="size-3 text-foreground shrink-0 select-none" title={origin.tooltip} />
                          ) : (
                            <Globe className="size-3 text-foreground shrink-0 select-none" title={origin.tooltip} />
                          );
                        })()}
                        <p className="text-[13px] font-bold tracking-tight text-foreground truncate leading-none">{order.orderId}</p>
                        {isNewOrder(order.createdAt) && (
                          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none">
                            NEW
                          </span>
                        )}
                      </div>
                      
                      {(() => {
                        const isShippedPhase = ['Shipped', 'Out For Delivery', 'Delivered', 'Returned', 'Cancelled'].includes(normalizeOrderStatus(order.status));
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 rounded text-muted-foreground -mr-1 -mt-1 shrink-0 cursor-pointer">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-38">
                              <DropdownMenuGroup>
                                {!isShippedPhase && (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEditModal(order)}
                                    className="cursor-pointer text-[12px]"
                                  >
                                    <Edit className="size-3.5 mr-2" />
                                    Edit Order
                                  </DropdownMenuItem>
                                )}
                                {(order.trackingNumber || order.nocParcelNo || order.nocThirdPartyNo) && (
                                  <DropdownMenuItem
                                    onClick={() => setNocTrackingOrder(order)}
                                    className="cursor-pointer text-[12px]"
                                  >
                                    <Truck className="size-3.5 mr-2 text-primary" />
                                    Track NOC
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                              {(!isShippedPhase || order.trackingNumber || order.nocParcelNo || order.nocThirdPartyNo) && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer text-[12px]"
                                onClick={() => handleDeleteOrder(order)}
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Move to Trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-muted-foreground truncate leading-tight">
                        <span className="font-semibold text-foreground">{order.customerName}</span>
                        {order.customerCity ? <span className="text-[12px] font-medium text-foreground/80"> • {order.customerCity}</span> : ''}
                      </p>
                      <Badge
                        variant={order.isDraft ? 'outline' : (statusVariant[order.status] || 'secondary')}
                        className={cn('text-[11px] px-2 py-0.5 font-semibold', order.isDraft ? 'border-slate-300 bg-slate-50 text-slate-700' : getStatusBadgeClass(order.status))}
                      >
                        {getOrderDisplayStatus(order)}
                      </Badge>
                    </div>

                    {(() => {
                      const isShippedPhase = ['Shipped', 'Out For Delivery', 'Delivered', 'Returned'].includes(order.status) || showNocColumns;
                      const has3rdParty = order.nocThirdPartyNo && String(order.nocThirdPartyNo).trim() !== '' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'N/A' && String(order.nocThirdPartyNo).trim().toUpperCase() !== 'NA';
                      const displayTracking = has3rdParty ? String(order.nocThirdPartyNo).trim() : (order.nocParcelNo || order.trackingNumber);
                      const courierToDisplay = order.courierName || (order.trackingNumber ? 'NOC' : '—');

                      if (!isShippedPhase || !displayTracking) return null;

                      const effectiveTime = getEffectiveNocStatusTime(order);
                      const statusTimeAgo = effectiveTime ? formatSmartTimeAgo(effectiveTime) : '';

                      return (
                        <div className="flex items-center justify-between gap-2 py-1.5 border-t border-border/40 text-[12px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[12px] font-bold text-foreground truncate" title={has3rdParty ? `3rd Party No: ${displayTracking}` : `Parcel No: ${displayTracking}`}>
                              {displayTracking}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground truncate">({courierToDisplay})</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setNocTrackingOrder(order)}
                              className="text-[12px] font-semibold text-foreground hover:underline cursor-pointer"
                            >
                              {(() => {
                                const raw = order.nocStatus || '';
                                if (raw && !raw.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
                                  return raw;
                                }
                                return order.status === 'Delivered' ? 'Delivered' : (order.status === 'Out For Delivery' ? 'INTRANSIT' : 'Booked');
                              })()}
                            </button>
                            {statusTimeAgo && (
                              <span className="text-[10.5px] text-muted-foreground font-normal">
                                • {statusTimeAgo}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Mobile Amounts Row: COD & Total */}
                    <div className="flex items-center justify-between gap-2 py-1.5 border-t border-border/40 text-[12.5px]">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          COD: <strong className="text-foreground font-bold">{formatPrice(getCodAmount(order))}</strong>
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-muted-foreground">
                          Total: <span className="font-medium text-foreground">{formatPrice(order.totalAmount)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Mobile Date & View Action */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex flex-col" title={formatFullDateTime(order.createdAt)}>
                        <span className="text-[12px] font-semibold text-foreground">
                          {formatSmartTimeAgo(order.createdAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                        </span>
                      </div>
                      
                      <OrderQuickViewDialog
                        order={order}
                        triggerLabel="View"
                        triggerSize="sm"
                        triggerClassName="h-6.5 px-3 text-[11px] rounded-md border border-border shadow-xs font-medium shrink-0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" />
              Move to Trash?
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Order <strong>{deleteConfirm?.orderId}</strong> ({deleteConfirm?.label}) will be moved to Trash. You can restore it within 50 days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1.5 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={isDeleting} onClick={confirmDeleteOrder} className="min-w-[100px]">
              {isDeleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {isDeleting ? 'Deleting...' : 'Move to Trash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Draft Order Dialog */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            resetDraftComposer();
          }
        }}
      >
        <DialogContent className="max-h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-none border-0 p-3 sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:p-5 lg:max-w-5xl lg:p-6 xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Create Draft Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDraftOrder} className="flex flex-col gap-3 py-1 sm:gap-4" autoComplete="off">
            {/* Form start */}
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start lg:gap-4">
              <div className="min-w-0 space-y-3">
                <div className="relative z-20 min-w-0 rounded-2xl border border-border/80 bg-card p-3 shadow-[0_14px_30px_-32px_rgba(15,23,42,0.4)] lg:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p>
                  </div>
                </div>

                <FieldGroup className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Full Name <span className="text-destructive">*</span></FieldLabel>
                    <div className="relative">
                      <Input
                        className={cn('h-9 rounded-xl px-3 text-[13px]', !draftForm.customerName && 'border-destructive/80 ring-1 ring-destructive/80')}
                        value={draftForm.customerName}
                        onChange={(event) => onCustomerNameChange(event.target.value)}
                        onFocus={() => {
                          if (customerSuggestions.length > 0) setCustomerSuggestionsOpen(true);
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setCustomerSuggestionsOpen(false), 150);
                        }}
                        autoComplete="new-password"
                        required
                      />
                      {isSearchingCustomers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner className="h-3 w-3" />
                        </div>
                      )}
                      {customerSuggestionsOpen && customerSuggestions.length > 0 ? (
                        <div className="absolute top-full z-[120] mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                          <div className="max-h-56 overflow-y-auto p-1">
                            {customerSuggestions.map((cust) => (
                              <button
                                key={cust._id}
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  selectCustomer(cust);
                                }}
                                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
                              >
                                <span className="font-medium">{cust.name}</span>
                                <span className="text-[11px] text-muted-foreground">{cust.phone} {cust.city ? `- ${cust.city}` : ''}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Phone <span className="text-destructive">*</span></FieldLabel>
                    <Input
                      className={cn('h-9 rounded-xl px-3 text-[13px]', !draftForm.customerPhone && 'border-destructive/80 ring-1 ring-destructive/80')}
                      value={draftForm.customerPhone}
                      onChange={(event) => updateDraftField('customerPhone', event.target.value)}
                      autoComplete="new-password"
                      placeholder="03xxxxxxxxx"
                      pattern="^03[0-9]{9}$"
                      title="Format: 03xxxxxxxxx (11 digits)"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">City <span className="text-destructive">*</span></FieldLabel>
                    <div className="relative">
                      <Input
                        className={cn('h-9 rounded-xl px-3 text-[13px]', !draftForm.customerCity && 'border-destructive/80 ring-1 ring-destructive/80')}
                        value={draftForm.customerCity}
                        autoComplete="new-password"
                        onChange={(event) => {
                          updateDraftField('customerCity', event.target.value);
                          setCitySuggestionsOpen(true);
                        }}
                        onFocus={() => setCitySuggestionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setCitySuggestionsOpen(false), 120);
                        }}
                        placeholder="Start typing city"
                        required
                      />
                      {citySuggestionsOpen && filteredDraftCities.length > 0 ? (
                        <div className="absolute top-full z-[120] mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                          <div className="max-h-56 overflow-y-auto p-1">
                            {filteredDraftCities.map((city) => (
                              <button
                                key={city}
                                type="button"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  updateDraftField('customerCity', city);
                                  setCitySuggestionsOpen(false);
                                }}
                                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-muted"
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Landmark</FieldLabel>
                    <Input className="h-9 rounded-xl px-3 text-[13px]" value={draftForm.landmark} onChange={(event) => updateDraftField('landmark', event.target.value)} autoComplete="new-password" />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Full Address <span className="text-destructive">*</span></FieldLabel>
                    <Input
                      className={cn('h-9 rounded-xl px-3 text-[13px]', !draftForm.customerAddress && 'border-destructive/80 ring-1 ring-destructive/80')}
                      value={draftForm.customerAddress}
                      onChange={(event) => updateDraftField('customerAddress', event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Notes</FieldLabel>
                    <Textarea rows={3} className="min-h-24 rounded-xl px-3 py-2 text-[13px]" value={draftForm.notes} onChange={(event) => updateDraftField('notes', event.target.value)} placeholder="Internal note" />
                  </Field>
                </FieldGroup>
              </div>

              <div className="relative z-10 min-w-0 rounded-2xl border border-border/80 bg-card p-3 shadow-[0_14px_30px_-32px_rgba(15,23,42,0.4)] lg:p-4">
                <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order Setup</p>
                  </div>

                  <FieldGroup className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-[12px]">COD Amount</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          className="h-9 rounded-xl px-3 text-[13px]"
                          value={draftForm.manualCodAmount}
                          onChange={(event) => updateDraftField('manualCodAmount', event.target.value)}
                          placeholder={`Auto (= ${formatPrice(draftTotalAmount || 0)})`}
                        />
                        <FieldDescription className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                          {draftForm.manualCodAmount
                            ? `COD will be: ${formatPrice(draftForm.manualCodAmount)}`
                            : `Auto-calculate: COD = ${formatPrice(draftTotalAmount || 0)}`
                          }
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-[12px]">Source Tag</FieldLabel>
                        <Select value={draftForm.sourceTag || undefined} onValueChange={(value) => updateDraftField('sourceTag', value)}>
                          <SelectTrigger className="h-9 rounded-xl px-3 text-[13px]">
                            <SelectValue placeholder="Pick source..." />
                          </SelectTrigger>
                          <SelectContent className="z-[300]">
                            <SelectGroup>
                              {DRAFT_SOURCE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-[13px]">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-[12px]">Item Type</FieldLabel>
                        <Input className="h-9 rounded-xl px-3 text-[13px]" value={draftForm.itemType} onChange={(event) => updateDraftField('itemType', event.target.value)} />
                      </Field>
                      <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-[12px]">Weight (kg)</FieldLabel>
                        <Input type="number" step="0.5" min="0.5" className="h-9 rounded-xl px-3 text-[13px]" value={draftForm.weight} onChange={(event) => updateDraftField('weight', event.target.value)} />
                      </Field>
                    </div>
                  </FieldGroup>
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <div className="min-w-0 rounded-2xl border border-border/80 bg-card p-3 shadow-[0_14px_30px_-32px_rgba(15,23,42,0.4)] lg:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items</p>
                    </div>
                    <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {draftItems.length} item{draftItems.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <Field className="mb-3">
                    <FieldLabel className="flex items-center gap-1.5 text-[12px]">Search & Add Items <span className="text-destructive">*</span></FieldLabel>
                      <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-9 w-full justify-between rounded-xl px-3 text-[13px] font-normal">
                            <span className="truncate text-muted-foreground">Search products, categories, or tags</span>
                            <Plus data-icon="inline-end" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[300] w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search product..."
                              onValueChange={(value) => {
                                catalogQueryRef.current = value;
                                window.clearTimeout(catalogSearchTimerRef.current);
                                catalogSearchTimerRef.current = window.setTimeout(() => {
                                  const q = String(value || '').trim();
                                  const url = q
                                    ? `/api/admin/products/catalog?q=${encodeURIComponent(q)}&limit=40`
                                    : '/api/admin/products/catalog?limit=40';
                                  fetch(url)
                                    .then((res) => res.json())
                                    .then((data) => {
                                      if (data.products) setCatalog(data.products);
                                    })
                                    .catch((err) => console.error(err));
                                }, 250);
                              }}
                            />
                          <CommandList>
                            <CommandEmpty>No matching product found.</CommandEmpty>
                            <CommandGroup className="max-h-80 overflow-y-auto">
                              {availableDraftProducts.map(({ product, primaryImage, categorySummary, searchValue }) => {
                                  return (
                                    <CommandItem
                                      key={product._id}
                                      value={searchValue}
                                      onSelect={() => addDraftProduct(product)}
                                      className="px-3 py-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted">
                                          {primaryImage?.url ? (
                                            <Image
                                              src={primaryImage.url}
                                              alt={product.Name}
                                              fill
                                              sizes="48px"
                                              className="object-cover"
                                              {...getBlurPlaceholderProps(primaryImage.blurDataURL)}
                                            />
                                          ) : null}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-semibold text-foreground">{product.Name}</p>
                                          <div className="mt-1 flex flex-wrap gap-1.5">
                                            {categorySummary.length > 0 ? categorySummary.map((category) => (
                                              <span key={category} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                {category}
                                              </span>
                                            )) : (
                                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                Uncategorized
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold text-foreground">
                                          {formatPrice(product.discountedPrice ?? product.Price ?? 0)}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>

                  {/* Custom Item */}
                  <div className="mb-3 rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custom Item</p>
                    <div className="flex gap-2">
                      <Input
                        className="h-8 flex-1 rounded-xl px-2.5 text-[12px]"
                        placeholder="Item name"
                        value={draftForm.customItemName}
                        onChange={(e) => updateDraftField('customItemName', e.target.value)}
                      />
                      <Input
                        type="number"
                        className="h-8 w-24 rounded-xl px-2.5 text-[12px]"
                        placeholder="Price"
                        value={draftForm.customItemPrice}
                        onChange={(e) => updateDraftField('customItemPrice', e.target.value)}
                      />
                      <Button type="button" size="sm" variant="secondary" className="h-8 rounded-xl text-[12px]" onClick={addCustomItemToDraft}>
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {draftItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-[12px] text-muted-foreground">
                      Add products to build the draft order.
                    </div>
                  ) : (
                    <>
                        <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                          <div>
                    <table className="w-full table-fixed">
                      <thead className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="w-20 px-3 py-2">Qty</th>
                          <th className="w-24 px-3 py-2 text-right">Price</th>
                          <th className="w-12 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                      {draftItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="px-3 py-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative size-10 overflow-hidden rounded-lg border border-border/80 bg-muted">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                              <span className="truncate text-[13px] font-medium text-foreground">{item.name}</span>
                            </div>
                          </td>
                            <td className="px-3 py-2">
                              <Input type="number" min="1" className="ml-auto h-8 w-16 rounded-lg px-2 text-[12px]" value={item.quantity} onChange={(event) => updateDraftItemQuantity(item.productId, event.target.value)} />
                            </td>
                          <td className="px-3 py-2 text-right text-[12px] font-semibold text-foreground">
                            {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => removeDraftItem(item.productId)}>
                              <Trash2 className="size-4" />
                              <span className="sr-only">Remove item</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                        </div>
                      </div>

                        <div className="space-y-2.5 md:hidden">
                          {draftItems.map((item) => (
                            <div key={item.productId} className="rounded-xl border border-border bg-card p-3">
                              <div className="flex items-start gap-3">
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted">
                                  {item.image ? (
                                    <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-foreground">{item.name}</p>
                                  <p className="mt-1 text-[12px] font-semibold text-foreground">
                                    {formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <FieldLabel className="text-[11px] text-muted-foreground">Qty</FieldLabel>
                                  <Input type="number" min="1" className="h-8 w-16 rounded-lg px-2 text-[12px]" value={item.quantity} onChange={(event) => updateDraftItemQuantity(item.productId, event.target.value)} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={() => removeDraftItem(item.productId)}>
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Remove item</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {draftItems.length} item{draftItems.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">{formatPrice(draftTotalAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 z-[100] -mx-3 -mb-3 mt-4 bg-card/95 pb-3 pl-3 pr-3 pt-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur sm:-mx-5 sm:-mb-5 sm:pb-5 sm:pl-5 sm:pr-5 sm:pt-4 lg:-mx-6 lg:-mb-6 lg:pb-6 lg:pl-6 lg:pr-6 gap-1.5 sm:gap-2">
              {/* Also create invoice checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none mr-auto">
                <input
                  type="checkbox"
                  checked={createLinkedInvoice}
                  onChange={(e) => setCreateLinkedInvoice(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-medium text-foreground">Also create linked Invoice</span>
                <span className="text-[10px] text-muted-foreground">(default: on)</span>
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setIsCreateModalOpen(false); resetDraftComposer(); }} className="admin-cta-button">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingDraft} className="admin-cta-button min-w-[120px]">
                {isCreatingDraft ? <Spinner data-icon="inline-start" /> : null}
                {isCreatingDraft ? 'Creating...' : 'Create Draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={quickActionOrder !== null} onOpenChange={(open) => { if (!open) setQuickActionOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Quick Update</DialogTitle>
          </DialogHeader>
          <QuickUpdateForm
            quickStatus={quickStatus}
            setQuickStatus={setQuickStatus}
            quickTracking={quickTracking}
            setQuickTracking={setQuickTracking}
            editingOrder={editingOrder}
            setEditingOrder={setEditingOrder}
            isQuickUpdating={isQuickUpdating}
            onSubmit={() => handleQuickUpdate(quickActionOrder)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-[700px] w-[calc(100vw-32px)] overflow-y-auto p-5 sm:p-7 rounded-2xl shadow-2xl border border-border">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Edit Order <span className="font-mono text-primary font-semibold">{editingOrder?.orderId}</span>
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              Update consignee details, delivery address, ordered items, or COD amount.
            </DialogDescription>
          </DialogHeader>
          
          {editingOrder && (
            <form onSubmit={handleFullUpdate} className="flex flex-col gap-4 pt-3">
              {/* Section 1: Consignee Details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field className="space-y-1">
                  <FieldLabel htmlFor="customerName" className="text-[12px] font-semibold text-foreground">Customer Name</FieldLabel>
                  <Input id="customerName" name="customerName" className="h-9 text-[13px] rounded-lg" defaultValue={editingOrder.customerName} required />
                </Field>
                <Field className="space-y-1">
                  <FieldLabel htmlFor="customerPhone" className="text-[12px] font-semibold text-foreground">Phone Number</FieldLabel>
                  <Input id="customerPhone" name="customerPhone" className="h-9 text-[13px] rounded-lg" defaultValue={editingOrder.customerPhone} required />
                </Field>
              </div>

              {/* Section 2: City & Shipping Address */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field className="space-y-1">
                  <FieldLabel className="text-[12px] font-semibold text-foreground">City</FieldLabel>
                  <Popover open={cityOpen} onOpenChange={setCityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={cityOpen}
                        className="h-9 w-full justify-between text-[13px] font-normal rounded-lg"
                      >
                        <span className="truncate">{editingOrder.customerCity || editingOrder.city || "Select city..."}</span>
                        <ChevronsUpDown className="size-3.5 opacity-50 ml-1 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search city..." />
                        <CommandList>
                          <CommandEmpty>No city found.</CommandEmpty>
                          <CommandGroup className="max-h-52 overflow-y-auto">
                            {PAKISTAN_CITIES.map((city) => (
                              <CommandItem
                                key={city}
                                value={city}
                                onSelect={(currentValue) => {
                                  if (editingOrder) {
                                    setEditingOrder({ ...editingOrder, customerCity: currentValue });
                                  }
                                  setCityOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    (editingOrder.customerCity || editingOrder.city) === city ? "opacity-100" : "opacity-0",
                                    "size-3.5 mr-2"
                                  )}
                                />
                                {city}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field className="sm:col-span-2 space-y-1">
                  <FieldLabel htmlFor="customerAddress" className="text-[12px] font-semibold text-foreground">Complete Shipping Address</FieldLabel>
                  <Input id="customerAddress" name="customerAddress" className="h-9 text-[13px] rounded-lg" defaultValue={editingOrder.customerAddress} required />
                </Field>
              </div>

              {/* Section 3: Special Instructions / Courier Note */}
              <Field className="space-y-1">
                <FieldLabel htmlFor="notes" className="text-[12px] font-semibold text-foreground">Special Instructions / Courier Note</FieldLabel>
                <Input id="notes" name="notes" className="h-9 text-[13px] rounded-lg" defaultValue={editingOrder.notes || ''} placeholder="e.g. Call customer before delivery, urgent parcel..." />
              </Field>

              {/* Section 4: Ordered Items */}
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ordered Items ({editItems.length})</p>
                  <span className="text-[12px] font-bold text-foreground">
                    Items Total: <span className="text-primary">{formatPrice(editItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0))}</span>
                  </span>
                </div>

                {/* Inline Product Search & Add Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search product by name, category, or tag to add..."
                      className="h-9 pl-9 pr-9 text-[13px] rounded-lg border border-border bg-background focus:border-primary"
                      value={editProductSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditProductSearch(val);
                        catalogQueryRef.current = val;
                        window.clearTimeout(catalogSearchTimerRef.current);
                        catalogSearchTimerRef.current = window.setTimeout(() => {
                          const q = String(val || '').trim();
                          const url = q
                            ? `/api/admin/products/catalog?q=${encodeURIComponent(q)}&limit=40`
                            : '/api/admin/products/catalog?limit=40';
                          fetch(url)
                            .then((res) => res.json())
                            .then((data) => {
                              if (data.products) setCatalog(data.products);
                            })
                            .catch(console.error);
                        }, 250);
                      }}
                      onFocus={() => {
                        if (!catalog || catalog.length === 0) {
                          fetch('/api/admin/products/catalog?limit=40')
                            .then((res) => res.json())
                            .then((data) => {
                              if (data?.products) setCatalog(data.products);
                            })
                            .catch(console.error);
                        }
                      }}
                    />
                    {editProductSearch ? (
                      <button
                        type="button"
                        onClick={() => setEditProductSearch('')}
                        className="absolute right-3 top-2.5 size-4 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  {/* Live Search Results Dropdown */}
                  {editProductSearch.trim() !== '' && (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background shadow-lg divide-y divide-border/60">
                      {availableEditProducts.length === 0 ? (
                        <p className="p-3 text-center text-[12px] text-muted-foreground">No matching products found.</p>
                      ) : (
                        availableEditProducts.map(({ product, primaryImage, categorySummary }) => {
                          const price = Number(product.discountedPrice ?? product.Price ?? 0);
                          return (
                            <div
                              key={product._id}
                              className="flex items-center justify-between gap-3 p-2.5 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {primaryImage?.url ? (
                                  <img src={primaryImage.url} alt={product.Name} className="size-9 rounded-md object-cover border shrink-0 bg-background" />
                                ) : (
                                  <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0 text-xs">📦</div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-semibold text-foreground truncate">{product.Name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-primary">{formatPrice(price)}</span>
                                    {categorySummary.length > 0 && (
                                      <span className="text-[10px] text-muted-foreground truncate">• {categorySummary[0]}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  addEditProduct(product);
                                  toast.success(`Added ${product.Name}`);
                                }}
                                className="h-7 px-3 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md shrink-0 cursor-pointer"
                              >
                                <Plus className="size-3.5 mr-1" /> Add
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {editItems.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-muted-foreground">No items in this order. Search and add products above.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-border/50">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {item.image ? (
                            <img src={item.image} alt={item.name || 'Product'} className="size-10 rounded-lg object-cover border shrink-0 bg-background" />
                          ) : (
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm">📦</div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{item.name || item.title || 'Item'}</p>
                            <span className="text-[11px] text-muted-foreground">{formatPrice(item.price || 0)} each</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-[13px] rounded cursor-pointer"
                              onClick={() => {
                                setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, (Number(it.quantity) || 1) - 1) } : it));
                              }}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center text-[13px] font-bold tabular-nums text-foreground">{item.quantity || 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-[13px] rounded cursor-pointer"
                              onClick={() => {
                                setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: (Number(it.quantity) || 1) + 1 } : it));
                              }}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => {
                              setEditItems(prev => prev.filter((_, i) => i !== idx));
                            }}
                            title="Remove item"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: COD Amount & Weight */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field className="space-y-1">
                  <FieldLabel htmlFor="manualCodAmount" className="text-[12px] font-semibold text-foreground">COD Amount (Override)</FieldLabel>
                  <Input id="manualCodAmount" name="manualCodAmount" type="number" className="h-9 text-[13px] rounded-lg" placeholder="Blank = auto bill total" defaultValue={editingOrder.manualCodAmount ?? ''} />
                </Field>
                <Field className="space-y-1">
                  <FieldLabel htmlFor="weight" className="text-[12px] font-semibold text-foreground">Parcel Weight (kg)</FieldLabel>
                  <Input id="weight" name="weight" type="number" step="0.5" className="h-9 text-[13px] rounded-lg" defaultValue={editingOrder.weight ?? 2} required />
                </Field>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)} className="h-9 px-4 text-xs font-medium cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isUpdating} className="h-9 px-6 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white min-w-[120px] cursor-pointer">
                  {isUpdating ? <Spinner className="size-3.5 mr-2" /> : null}
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination (Only for All Orders Tab) */}
      {statusFilter === 'all' && totalPages > 1 && (
        <div className="flex flex-col gap-2 px-1 py-2">
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * pageSize, total)}
            </span>{' '}
            of <span className="font-medium text-foreground">{total}</span> orders
          </p>
          <AppPagination
            page={currentPage}
            totalPages={totalPages}
            getHref={(page) => buildHref(pathname, searchParams, { page })}
          />
        </div>
      )}

      {/* NOC Express Bulk Booking Dialog */}
      <Dialog open={nocBookingOpen} onOpenChange={setNocBookingOpen}>
        <DialogContent className="max-w-md bg-white text-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Truck className="size-5 text-sky-600" />
              Book Selected with NOC Express
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {enableSecondaryNoc ? `Select NOC account to send ${selectedOrders.length} selected order(s):` : `Book ${selectedOrders.length} selected order(s) via Main NOC Account:`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {enableSecondaryNoc ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Select NOC Account
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {NOC_PORTALS.map((portal) => {
                    const isSelected = selectedNocPortal === portal.id;
                    return (
                      <button
                        key={portal.id}
                        type="button"
                        onClick={() => setSelectedNocPortal(portal.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20 font-semibold'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-medium">{portal.name}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs flex items-center justify-between">
                <span className="font-semibold text-sky-900">Courier Account:</span>
                <span className="font-bold text-sky-800 bg-white px-2.5 py-1 rounded-md border border-sky-300 text-[11px]">
                  Unique Items (Main)
                </span>
              </div>
            )}

            {/* Simple White Light Summary Box */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-center justify-between">
              <span className="font-semibold text-gray-700">Selected Orders:</span>
              <span className="font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 text-xs">
                {selectedOrders.length} Order(s)
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setNocBookingOpen(false)} className="rounded-xl h-10 px-4 text-gray-700 hover:bg-gray-100 border-gray-300">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkNocBooking}
              disabled={isBookingNoc}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl h-10 px-5 shadow-sm"
            >
              {isBookingNoc ? <Spinner data-icon="inline-start" /> : <Send className="size-4 mr-1.5" />}
              {isBookingNoc ? 'Booking...' : `Confirm & Book (${selectedOrders.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared NOC Live Tracking Modal */}
      <NocTrackingModal
        open={!!nocTrackingOrder}
        onOpenChange={(open) => !open && setNocTrackingOrder(null)}
        trackingNumber={
          (nocTrackingOrder?.nocThirdPartyNo && String(nocTrackingOrder.nocThirdPartyNo).trim() !== '' && String(nocTrackingOrder.nocThirdPartyNo).trim().toUpperCase() !== 'N/A')
            ? String(nocTrackingOrder.nocThirdPartyNo).trim()
            : (nocTrackingOrder?.nocParcelNo || nocTrackingOrder?.trackingNumber)
        }
        orderId={nocTrackingOrder?.orderId}
        courierName={nocTrackingOrder?.courierName || 'NOC'}
        nocLabelUrl={nocTrackingOrder?.nocLabelUrl}
        isAdmin={true}
      />

      {/* Sync NOC Excel / Loadsheet Modal */}
      <SyncNocSheetModal
        open={isSyncSheetModalOpen}
        onOpenChange={setIsSyncSheetModalOpen}
        onSuccess={() => router.refresh()}
      />

      {/* NOC Express Booking Success & Print Slips Popup Dialog */}
      <Dialog open={!!nocPrintResult} onOpenChange={(open) => !open && setNocPrintResult(null)}>
        <DialogContent className="max-w-md bg-white text-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="text-xl">🎉</span>
              Booking Successful!
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              {nocPrintResult?.count || 0} order(s) successfully booked with NOC Express and moved to <strong className="text-gray-900">Shipped</strong> status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* NOC Account Used Indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs">
              <span className="font-semibold text-gray-700">Account Used:</span>
              <span className="font-bold text-sky-900 bg-sky-100 px-3 py-1 rounded-full border border-sky-300">
                {nocPrintResult?.portalKey === 'portal_2' ? 'Secondary Account (aamsaman)' : 'Main Account (unique items)'}
              </span>
            </div>

            {nocPrintResult?.orders?.length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2 max-h-48 overflow-y-auto">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">Booked Orders & Slips:</span>
                <div className="space-y-1.5">
                  {nocPrintResult.orders.map((o, idx) => {
                    const slipUrl = o.labelUrl;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200 text-xs">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-gray-900">{o.orderId}</span>
                          {o.trackingNumber && (
                            <span className="ml-2 font-mono text-[11px] text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              {o.trackingNumber}
                            </span>
                          )}
                        </div>
                        {slipUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(slipUrl, '_blank')}
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Printer className="size-3" />
                            Print Slip
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNocPrintResult(null)}
              className="rounded-xl h-10 px-4 text-gray-700 hover:bg-gray-100 border-gray-300 font-medium"
            >
              Close
            </Button>
            {nocPrintResult?.orders?.length > 0 ? (
              <Button
                size="sm"
                onClick={() => {
                  const slipUrls = nocPrintResult.orders.map((o) => o.labelUrl).filter(Boolean);
                  if (slipUrls.length === 0 && nocPrintResult.labelUrl) {
                    slipUrls.push(nocPrintResult.labelUrl);
                  }
                  slipUrls.forEach((url, i) => {
                    setTimeout(() => {
                      window.open(url, '_blank');
                    }, i * 300);
                  });
                  setNocPrintResult(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-10 px-5 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="size-4" />
                Print All Slips ({nocPrintResult.orders.length})
              </Button>
            ) : nocPrintResult?.labelUrl ? (
              <Button
                size="sm"
                onClick={() => {
                  window.open(nocPrintResult.labelUrl, '_blank');
                  setNocPrintResult(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-10 px-5 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="size-4" />
                Print Airway Slip
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NOC Print Slips Account Selection Dialog */}
      <Dialog open={!!nocPrintAccountModal} onOpenChange={(open) => !open && setNocPrintAccountModal(null)}>
        <DialogContent className="max-w-md bg-white text-gray-900 rounded-2xl p-6 shadow-xl border border-gray-200">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Printer className="size-5 text-emerald-600" />
              Print Shipping Slips by Account
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Select which NOC Account slips you would like to open for printing:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Main Account Option */}
            <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-900 block">Main Account (unique items)</span>
                <span className="text-[11px] text-sky-700">{nocPrintAccountModal?.p1Count || 0} order slip(s) ready</span>
              </div>
              <Button
                size="sm"
                disabled={!nocPrintAccountModal?.p1Url}
                onClick={() => {
                  if (nocPrintAccountModal.p1Url) window.open(nocPrintAccountModal.p1Url, '_blank');
                  setNocPrintAccountModal(null);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs rounded-lg px-3 py-1.5 h-8 font-semibold cursor-pointer"
              >
                Print ({nocPrintAccountModal?.p1Count || 0})
              </Button>
            </div>

            {/* Secondary Account Option */}
            <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-900 block">Secondary Account (aamsaman)</span>
                <span className="text-[11px] text-purple-700">{nocPrintAccountModal?.p2Count || 0} order slip(s) ready</span>
              </div>
              <Button
                size="sm"
                disabled={!nocPrintAccountModal?.p2Url}
                onClick={() => {
                  if (nocPrintAccountModal.p2Url) window.open(nocPrintAccountModal.p2Url, '_blank');
                  setNocPrintAccountModal(null);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg px-3 py-1.5 h-8 font-semibold cursor-pointer"
              >
                Print ({nocPrintAccountModal?.p2Count || 0})
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNocPrintAccountModal(null)}
              className="rounded-xl h-9 px-4 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!nocPrintAccountModal?.allUrls?.length}
              onClick={() => {
                nocPrintAccountModal.allUrls.forEach((url) => {
                  if (url) window.open(url, '_blank');
                });
                setNocPrintAccountModal(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-9 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Printer className="size-3.5" />
              Print All ({nocPrintAccountModal?.allUrls?.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Quick Update Form (shared between mobile popover & desktop dialog) ── */
function QuickUpdateForm({ quickStatus, setQuickStatus, quickTracking, setQuickTracking, editingOrder, setEditingOrder, isQuickUpdating, onSubmit }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel className="text-[11px]">Status</FieldLabel>
        <Select value={quickStatus} onValueChange={setQuickStatus}>
          <SelectTrigger className="h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.keys(statusVariant).map(s => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel className="text-[11px]">Tracking ID</FieldLabel>
        <Input 
          className="h-8 text-[12px]" 
          value={quickTracking} 
          onChange={(e) => setQuickTracking(e.target.value)} 
          placeholder="Enter Tracking ID"
        />
      </Field>
      <Field>
        <FieldLabel className="text-[11px]">Courier</FieldLabel>
        <Input 
          className="h-8 text-[12px]" 
          value={editingOrder?.courierName || ''} 
          onChange={(e) => setEditingOrder({ ...editingOrder, courierName: e.target.value })} 
          placeholder="e.g. Trax, Leopard, PostEx"
        />
      </Field>
      <Button 
        className="h-8 w-full text-[12px]" 
        disabled={isQuickUpdating} 
        onClick={onSubmit}
      >
        {isQuickUpdating ? <Spinner data-icon="inline-start" /> : null}
        {isQuickUpdating ? 'Updating...' : 'Update Order'}
      </Button>
    </FieldGroup>
  );
}

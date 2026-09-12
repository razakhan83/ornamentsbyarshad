'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Copy,
  Check,
  Send,
  Printer,
  FileText,
  RotateCw,
  Trash2,
  Phone,
  MessageCircle,
  MapPin,
  CreditCard,
  Package,
  User,
  History,
  Store,
  CheckCircle2,
  Truck,
  ExternalLink,
  ShoppingBag,
  Pencil,
  Globe,
  UserCog,
  Eye,
  RotateCcw,
  Search,
  Link2,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import NocTrackingModal from '@/components/NocTrackingModal';
import { NOC_PORTALS } from '@/lib/nocCourier';
import { normalizeOrderStatus, getOrderOriginInfo } from '@/lib/order-status';
import { updateOrderAction } from '@/app/actions/order.actions';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { formatSmartTimeAgo, formatFullDateTime, formatSmartTimeAgoWithExact } from '@/lib/timeAgo';
import { openPrintWindow, writePrintWindow, formatPrintCurrency, escapeHtml } from '../orderPrintUtils';

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

const EDITABLE_STATUSES = ['Draft', 'Order Confirmed', 'In Process', 'Packed'];

function formatPakistaniPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('03')) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

export default function OrderDetailView({
  order,
  logs = [],
  customerOtherOrders = [],
  nocTrackingDetail = [],
  enableSecondaryNoc = false,
}) {
  const router = useRouter();

  // Interactive States
  const [copiedField, setCopiedField] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState(order.nocAccountId || 'portal_1');
  const [isBooking, setIsBooking] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingInitialMode, setTrackingInitialMode] = useState('admin');
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);

  // Edit Order State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    customerCity: order.customerCity || '',
    customerAddress: order.customerAddress || '',
    landmark: order.landmark || '',
    status: order.isDraft ? 'Draft' : normalizeOrderStatus(order.status),
    orderType: order.orderType || (order.isDraft || order.sourceTag || order.invoiceId ? 'Admin' : 'Online'),
    manualCodAmount: order.manualCodAmount != null ? String(order.manualCodAmount) : '',
    notes: order.notes || '',
    sourceTag: order.sourceTag || '',
  });

  const isOrderEditable = order.isDraft || EDITABLE_STATUSES.includes(normalizeOrderStatus(order.status));

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Sync Live NOC Courier Status
  const handleSyncStatus = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/courier/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order._id || order.orderId] }),
      });
      const data = await safeReadJson(res);
      if (data.success) {
        const itemResult = data.results?.[0];
        if (itemResult?.changed) {
          toast.success(`NOC Status updated: ${itemResult.nocStatus || 'Updated'}`);
        } else {
          toast.info('Status is already up to date with courier.');
        }
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to sync courier status');
      }
    } catch (err) {
      toast.error('Network error while syncing status');
    } finally {
      setIsSyncing(false);
    }
  };

  // Book with NOC Express
  const handleBookNoc = async () => {
    setIsBooking(true);
    try {
      const res = await fetch('/api/admin/courier/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: [order._id || order.orderId],
          portalKey: selectedPortal,
        }),
      });
      const data = await safeReadJson(res);
      if (data.success) {
        toast.success(data.message || 'Parcel booked successfully with NOC Express!');
        setBookingModalOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to book courier parcel');
      }
    } catch (err) {
      toast.error('Network error booking parcel');
    } finally {
      setIsBooking(false);
    }
  };

  // Move to Trash
  const handleTrashOrder = async () => {
    setIsTrashing(true);
    try {
      const res = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order._id || order.orderId] }),
      });
      const data = await safeReadJson(res);
      if (data.success) {
        toast.success('Order moved to trash');
        router.push('/admin/orders');
      } else {
        toast.error(data.error || 'Failed to move order to trash');
      }
    } catch (err) {
      toast.error('Network error moving order to trash');
    } finally {
      setIsTrashing(false);
      setTrashModalOpen(false);
    }
  };

  // Sync NOC Status & Auto-Discover Parcel
  const [isSyncingNoc, setIsSyncingNoc] = useState(false);
  const handleSyncNocStatus = async () => {
    setIsSyncingNoc(true);
    try {
      const res = await fetch('/api/admin/courier/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order._id || order.orderId] }),
      });
      const data = await safeReadJson(res);
      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        const item = data.results[0];
        if (item.nocParcelNo) {
          toast.success(`NOC Parcel synced: ${item.nocParcelNo} (${item.nocStatus || 'Booked'})`);
        } else if (item.nocStatus) {
          toast.success(`NOC Status updated: ${item.nocStatus}`);
        } else {
          toast.info('NOC status is already up to date.');
        }
        router.refresh();
      } else {
        toast.error(data.error || 'No matching booking found on NOC portal.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Connection error syncing status with NOC.');
    } finally {
      setIsSyncingNoc(false);
    }
  };

  // ── "Check Order in NOC" Modal State & Handlers ──
  const [checkNocModalOpen, setCheckNocModalOpen] = useState(false);
  const [isSearchingNoc, setIsSearchingNoc] = useState(false);
  const [nocCandidateMatches, setNocCandidateMatches] = useState([]);
  const [linkingParcelNo, setLinkingParcelNo] = useState(null);
  const [manualParcelInput, setManualParcelInput] = useState('');
  const [manualCourierPartner, setManualCourierPartner] = useState('NOC Express');
  const [selectedSearchPortal, setSelectedSearchPortal] = useState('all');

  const handleOpenCheckNocModal = async () => {
    setCheckNocModalOpen(true);
    setIsSearchingNoc(true);
    setNocCandidateMatches([]);
    setManualParcelInput('');
    try {
      const res = await fetch(`/api/admin/courier/search-portal?orderId=${encodeURIComponent(order.orderId || order._id)}&portalKey=${selectedSearchPortal}`);
      const data = await safeReadJson(res);
      if (data.success && Array.isArray(data.matches)) {
        setNocCandidateMatches(data.matches);
      } else {
        toast.error(data.error || 'No matching bookings found on NOC.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to search NOC portal dashboard.');
    } finally {
      setIsSearchingNoc(false);
    }
  };

  const handleRefreshNocSearch = async (overridePortal) => {
    const pKey = overridePortal || selectedSearchPortal;
    setIsSearchingNoc(true);
    try {
      const res = await fetch(`/api/admin/courier/search-portal?orderId=${encodeURIComponent(order.orderId || order._id)}&portalKey=${pKey}`);
      const data = await safeReadJson(res);
      if (data.success && Array.isArray(data.matches)) {
        setNocCandidateMatches(data.matches);
        if (data.matches.length === 0) {
          toast.info('No active matching bookings found for this customer on NOC.');
        }
      } else {
        toast.error(data.error || 'Search error.');
      }
    } catch (err) {
      toast.error('Error connecting to NOC portal.');
    } finally {
      setIsSearchingNoc(false);
    }
  };

  const handleLinkNocCandidate = async (candidate) => {
    setLinkingParcelNo(candidate.parcelNo);
    try {
      const res = await fetch('/api/admin/courier/link-parcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId || order._id,
          parcelNo: candidate.parcelNo,
          courierName: candidate.courier || 'NOC Express',
          thirdPartyNo: candidate.thirdPartyNo || '',
          portalKey: candidate.portalKey || 'portal_1',
          nocStatus: candidate.status || 'Booked',
          nocStatusTime: candidate.statusDate || '',
        }),
      });
      const data = await safeReadJson(res);
      if (data.success) {
        toast.success(data.message || `Linked NOC Parcel #${candidate.parcelNo} successfully!`);
        setCheckNocModalOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to link parcel to order.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error linking parcel.');
    } finally {
      setLinkingParcelNo(null);
    }
  };

  const handleManualLinkSubmit = async (e) => {
    e?.preventDefault();
    const clean = manualParcelInput.trim();
    if (!clean) {
      toast.error('Please enter a parcel number / tracking number.');
      return;
    }
    setLinkingParcelNo(clean);
    try {
      const res = await fetch('/api/admin/courier/link-parcel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId || order._id,
          parcelNo: clean,
          courierName: manualCourierPartner || 'NOC Express',
          portalKey: selectedSearchPortal === 'portal_2' ? 'portal_2' : 'portal_1',
        }),
      });
      const data = await safeReadJson(res);
      if (data.success) {
        toast.success(data.message || `Linked NOC Parcel #${clean} successfully!`);
        setCheckNocModalOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to link manual parcel.');
      }
    } catch (err) {
      toast.error('Error linking manual parcel.');
    } finally {
      setLinkingParcelNo(null);
    }
  };

  // Handle Edit Form Submission
  const handleSaveOrderEdit = async (e) => {
    e?.preventDefault();
    setIsSavingEdit(true);

    try {
      const updates = {
        customerName: editFormData.customerName.trim(),
        customerPhone: editFormData.customerPhone.trim(),
        customerCity: editFormData.customerCity.trim(),
        customerAddress: editFormData.customerAddress.trim(),
        landmark: editFormData.landmark.trim(),
        status: editFormData.status,
        orderType: editFormData.orderType,
        manualCodAmount: editFormData.manualCodAmount !== '' ? Number(editFormData.manualCodAmount) : undefined,
        notes: editFormData.notes.trim(),
        sourceTag: editFormData.sourceTag.trim(),
      };

      const res = await updateOrderAction(order._id, updates);
      if (res.success) {
        toast.success('Order details updated successfully!');
        setEditModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update order');
      }
    } catch (err) {
      toast.error('Error saving order changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Print Invoice Popup
  const handlePrintInvoice = () => {
    const printWindow = openPrintWindow(`Invoice - ${order.orderId}`);
    if (!printWindow) {
      toast.error('Please allow popups to print invoices.');
      return;
    }

    const itemsMarkup = (order.items || [])
      .map(
        (item, idx) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${idx + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
          <strong>${escapeHtml(item.name || 'Product')}</strong>
          ${item.productId ? `<div style="font-size: 12px; color: #64748b;">ID: ${escapeHtml(item.productId)}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: right;">${formatPrintCurrency(item.price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: right; font-weight: bold;">${formatPrintCurrency((item.price || 0) * (item.quantity || 1))}</td>
      </tr>
    `
      )
      .join('');

    const invoiceHtml = `
      <div class="print-shell" style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 28px;">
          <div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">ORNAMENTS BY ARSHAD</h1>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Luxury Fine Jewelry • Sales Invoice</p>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background: #0f172a; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-bottom: 6px;">
              ${escapeHtml(order.orderId)}
            </div>
            <div style="font-size: 13px; color: #64748b;">Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : 'N/A'}</div>
          </div>
        </header>

        <section style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div>
            <h3 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Billed & Delivered To:</h3>
            <p style="margin: 0; font-size: 16px; font-weight: 700;">${escapeHtml(order.customerName)}</p>
            <p style="margin: 6px 0 0; font-size: 14px; color: #334155;">Phone: ${escapeHtml(order.customerPhone || 'N/A')}</p>
            <p style="margin: 6px 0 0; font-size: 14px; color: #334155;">Address: ${escapeHtml(order.customerAddress || 'N/A')}</p>
            ${order.customerCity ? `<p style="margin: 6px 0 0; font-size: 14px; color: #334155; font-weight: 600;">City: ${escapeHtml(order.customerCity)}</p>` : ''}
          </div>
          <div>
            <h3 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Shipment & Payment:</h3>
            <p style="margin: 0; font-size: 14px;"><strong>Payment Method:</strong> ${escapeHtml(order.paymentStatus === 'Paid' ? 'Paid / Online' : 'Cash on Delivery (COD)')}</p>
            <p style="margin: 6px 0 0; font-size: 14px;"><strong>Courier:</strong> ${escapeHtml(order.courierName || 'NOC Express')}</p>
            ${order.nocThirdPartyNo || order.nocParcelNo || order.trackingNumber ? `<p style="margin: 6px 0 0; font-size: 14px;"><strong>Tracking No:</strong> ${escapeHtml(order.nocThirdPartyNo || order.nocParcelNo || order.trackingNumber)}</p>` : ''}
          </div>
        </section>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; width: 40px;">#</th>
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">Item Description</th>
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: center; width: 70px;">Qty</th>
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: right; width: 120px;">Unit Price</th>
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: right; width: 130px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsMarkup}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 36px;">
          <div style="width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px;">
              <span style="color: #64748b;">Subtotal:</span>
              <span>${formatPrintCurrency(order.totalAmount - (order.shippingAmount || 0))}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px;">
              <span style="color: #64748b;">Delivery Fee:</span>
              <span>${formatPrintCurrency(order.shippingAmount || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; border-top: 2px solid #cbd5e1; padding-top: 10px; color: #0f172a;">
              <span>Total Payable:</span>
              <span>${formatPrintCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        <footer style="border-top: 1px dashed #cbd5e1; padding-top: 20px; text-align: center; font-size: 13px; color: #64748b;">
          Thank you for choosing Ornaments by Arshad!
        </footer>
      </div>
    `;

    writePrintWindow(printWindow, `Invoice - ${order.orderId}`, invoiceHtml);
  };

  const hasNocTracking = Boolean(order.nocParcelNo || order.trackingNumber || order.nocThirdPartyNo);
  const effectiveTracking = (
    order.nocThirdPartyNo && order.nocThirdPartyNo.trim() !== '' && order.nocThirdPartyNo.trim().toUpperCase() !== 'N/A'
      ? order.nocThirdPartyNo
      : (order.nocParcelNo || order.trackingNumber)
  )?.trim();

  const formattedPhone = formatPakistaniPhone(order.customerPhone);
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Salam ${order.customerName || 'Customer'}, regarding your Order ${order.orderId} from Ornaments by Arshad:`)}`
    : null;
  const callUrl = order.customerPhone ? `tel:${order.customerPhone}` : null;

  // Build unified chronological timeline
  const combinedTimeline = [];

  // 1. Add NOC Courier Events
  if (Array.isArray(nocTrackingDetail) && nocTrackingDetail.length > 0) {
    nocTrackingDetail.forEach((event, idx) => {
      combinedTimeline.push({
        id: `noc-${idx}`,
        type: 'noc',
        title: event.PacelStatus || event.ParcelStatus || 'Status Update',
        time: event.DateTime || event.dateTime || '',
        remarks: event.Remarks || '',
        author: `Courier: ${order.courierName || 'NOC'}`,
        timestamp: event.DateTime ? new Date(event.DateTime).getTime() : 0,
      });
    });
  } else if (order.nocStatus) {
    combinedTimeline.push({
      id: 'noc-latest',
      type: 'noc',
      title: order.nocStatus,
      time: order.nocStatusTime || (order.nocLastTrackedAt ? new Date(order.nocLastTrackedAt).toLocaleString('en-PK') : ''),
      remarks: order.nocRemarks || '',
      author: `Courier: ${order.courierName || 'NOC'}`,
      timestamp: order.nocStatusTime ? new Date(order.nocStatusTime).getTime() : 0,
    });
  }

  // 2. Add Order Activity Logs
  if (Array.isArray(logs) && logs.length > 0) {
    logs.forEach((log) => {
      combinedTimeline.push({
        id: `log-${log._id}`,
        type: 'log',
        title: log.action ? log.action.replace(/_/g, ' ') : 'Order Update',
        time: log.createdAt ? new Date(log.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '',
        remarks: log.details || '',
        author: log.adminName || log.adminEmail ? `By ${log.adminName || log.adminEmail}` : 'System',
        timestamp: log.createdAt ? new Date(log.createdAt).getTime() : 0,
      });
    });
  }

  // 3. Fallback Initial Log if empty
  if (combinedTimeline.length === 0 && order.createdAt) {
    combinedTimeline.push({
      id: 'order-created',
      type: 'log',
      title: 'Order Placed',
      time: new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
      remarks: `Order created for Rs. ${order.totalAmount.toLocaleString('en-PK')}`,
      author: order.sourceTag ? `Source: ${order.sourceTag}` : 'Store Checkout',
      timestamp: new Date(order.createdAt).getTime(),
    });
  }

  // Calculate items count and cost
  const totalItemsCount = (order.items || []).reduce((acc, item) => acc + Number(item.quantity || 1), 0);
  const itemsSubtotal = (order.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

  return (
    <div className="space-y-8 max-w-[1550px] mx-auto pb-16">
      {/* ── Top Header Bar (Flat, Clean) ── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-card border border-border p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin/orders"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-9 px-3 rounded-lg gap-2 text-sm font-medium text-muted-foreground hover:text-foreground")}
          >
            <ArrowLeft className="size-4" />
            <span>Back to Orders</span>
          </Link>

          <div className="flex items-center gap-2">
            {(() => {
              const origin = getOrderOriginInfo(order);
              return origin.isAdmin ? (
                <UserCog className="size-5 text-foreground shrink-0 select-none" title={origin.tooltip} />
              ) : (
                <Globe className="size-5 text-foreground shrink-0 select-none" title={origin.tooltip} />
              );
            })()}
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {order.orderId}
            </h1>
            <button
              type="button"
              onClick={() => copyToClipboard(order.orderId, 'Order ID')}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Copy Order ID"
            >
              {copiedField === 'Order ID' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Badge - Exactly identical to Orders page */}
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border', getStatusBadgeClass(order.status, order.isDraft))}>
              {order.isDraft ? 'Draft' : normalizeOrderStatus(order.status)}
            </span>

            {/* Payment Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
              {order.paymentStatus === 'Paid' ? 'Paid' : 'COD'}
            </span>

            {/* Source Tag if specified */}
            {order.sourceTag && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                <Store className="size-3.5" />
                {order.sourceTag}
              </span>
            )}

            {/* Order Placed Timestamp */}
            {order.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
                <span>Placed {formatFullDateTime(order.createdAt)}</span>
                <span className="px-2 py-0.5 rounded-full bg-muted font-bold text-[11px] text-foreground border border-border">
                  {formatSmartTimeAgo(order.createdAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Edit Order Button (Enabled up to Packed status) */}
          {isOrderEditable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="h-9 px-3.5 rounded-lg gap-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              <span>Edit Order</span>
            </Button>
          )}

          {/* Print Customer Invoice */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintInvoice}
            className="h-9 px-3.5 rounded-lg gap-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span>Invoice</span>
          </Button>

          {/* Delete / Move to Trash */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTrashModalOpen(true)}
            className="size-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Move to Trash"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Main 2-Column Grid (Left: 7 Cols, Right: 5 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ════════ LEFT COLUMN (7 COLS) ════════ */}
        <div className="lg:col-span-7 space-y-8">
          {/* Card 1: Customer & Delivery Info */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <User className="size-4" />
                </div>
                <span>Customer & Delivery Information</span>
              </div>
              <div className="flex items-center gap-2">
                {order.customerCity && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
                    {order.customerCity}
                  </span>
                )}
                {isOrderEditable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit Customer Details"
                  >
                    <Pencil className="size-3" />
                    <span>Edit</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Name</span>
                <p className="font-bold text-foreground text-base">{order.customerName || 'N/A'}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Phone</span>
                <div className="flex items-center gap-3 flex-wrap pt-0.5">
                  <span className="font-mono font-bold text-foreground text-base">{order.customerPhone || 'Not provided'}</span>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                      title="Open WhatsApp Chat"
                    >
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      WhatsApp
                    </a>
                  )}
                  {callUrl && (
                    <a
                      href={callUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                      title="Call Phone"
                    >
                      <Phone className="size-3.5 text-muted-foreground" />
                      Call
                    </a>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Delivery Address
                </span>
                <p className="text-foreground text-sm font-medium leading-relaxed">
                  {order.customerAddress || 'No address provided'}
                  {order.landmark ? (
                    <span className="block mt-1 text-xs text-muted-foreground font-normal">
                      Landmark: {order.landmark}
                    </span>
                  ) : null}
                </p>
              </div>

              {order.notes && (
                <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-border">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Notes</span>
                  <p className="text-sm text-foreground bg-muted/30 border-l-2 border-border pl-3.5 py-1.5 leading-relaxed italic">
                    &quot;{order.notes}&quot;
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Items & Sourcing Breakdown */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Package className="size-4" />
                </div>
                <span>Ordered Items ({totalItemsCount})</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">
                Subtotal: Rs. {itemsSubtotal.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="divide-y divide-border">
              {(order.items || []).map((item, index) => {
                const itemTotal = Number(item.price || 0) * Number(item.quantity || 1);
                return (
                  <div
                    key={`${item.productId}-${index}`}
                    className="py-5 first:pt-0 last:pb-0 space-y-3"
                  >
                    {/* Item Main Row */}
                    <div className="flex items-start gap-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || 'Product'}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground uppercase">
                            N/A
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-bold text-foreground leading-snug">
                              {item.name || 'Product'}
                            </h4>
                            {item.productId && (
                              <span className="text-xs text-muted-foreground font-mono mt-0.5 block">
                                ID: {item.productId}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-base font-extrabold text-foreground">
                              Rs. {itemTotal.toLocaleString('en-PK')}
                            </span>
                            <span className="block text-xs text-muted-foreground font-medium mt-0.5">
                              {item.quantity} × Rs. {Number(item.price || 0).toLocaleString('en-PK')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sourcing Vendor Information */}
                    {Array.isArray(item.sourcingVendors) && item.sourcingVendors.length > 0 && (
                      <div className="pt-2 pl-20 space-y-1.5">
                        <span className="font-semibold text-xs text-muted-foreground block">
                          Vendor Sourcing:
                        </span>
                        <div className="space-y-1">
                          {item.sourcingVendors.map((vendor, vIdx) => (
                            <div key={vIdx} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                <strong className="text-foreground font-medium">{vendor.name}</strong>
                                {vendor.shopNumber && <span className="ml-1.5">(Shop: {vendor.shopNumber})</span>}
                                {vendor.vendorProductName && <span className="ml-1.5 italic">&quot;{vendor.vendorProductName}&quot;</span>}
                              </span>
                              <span className="font-mono font-medium text-foreground">
                                {vendor.vendorPrice != null ? `Rs. ${Number(vendor.vendorPrice).toLocaleString('en-PK')}` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Card 3: Financials & COD Breakdown */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3 text-foreground font-bold text-base border-b border-border pb-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <CreditCard className="size-4" />
              </div>
              <span>Payment & Charges Breakdown</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-foreground">Rs. {itemsSubtotal.toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Delivery Fee:</span>
                <span className="font-semibold text-foreground">
                  {order.shippingAmount != null ? `Rs. ${Number(order.shippingAmount).toLocaleString('en-PK')}` : 'Rs. 0'}
                </span>
              </div>
              {order.discountAmount ? (
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Discount Applied:</span>
                  <span className="font-semibold text-foreground">-Rs. {Number(order.discountAmount).toLocaleString('en-PK')}</span>
                </div>
              ) : null}

              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <span className="text-base font-bold text-foreground">Total Order Amount:</span>
                <span className="text-xl font-black text-foreground font-mono">
                  Rs. {Number(order.totalAmount || 0).toLocaleString('en-PK')}
                </span>
              </div>

              {/* Clean COD Highlight Row */}
              <div className="pt-2 flex justify-between items-baseline text-sm">
                <div>
                  <span className="font-bold text-foreground block">
                    COD to Collect:
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Method: {order.paymentStatus === 'Paid' ? 'Paid / Remitted' : 'Cash on Delivery'}
                  </span>
                </div>
                <span className="text-lg font-black text-foreground font-mono">
                  Rs. {Number(order.manualCodAmount ?? order.totalAmount ?? 0).toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          </section>

          {/* Card 4: Customer Order History (Repeat Customer Detection) */}
          <section className="rounded-xl bg-card border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <ShoppingBag className="size-4" />
                </div>
                <span>Customer Order History</span>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                {customerOtherOrders.length > 0
                  ? `Repeat Customer (${customerOtherOrders.length} previous)`
                  : 'First-time Customer'}
              </span>
            </div>

            {customerOtherOrders.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No other orders found for phone number {order.customerPhone || '—'}.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {customerOtherOrders.map((pastOrder) => (
                  <div
                    key={pastOrder._id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 px-3 rounded-lg transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <Link
                        href={`/admin/orders/${pastOrder._id}`}
                        className="font-bold text-foreground hover:underline font-mono text-sm flex items-center gap-1.5"
                      >
                        <span>{pastOrder.orderId}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </Link>
                      <span className="text-xs text-muted-foreground block">
                        {pastOrder.createdAt
                          ? new Date(pastOrder.createdAt).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}{' '}
                        • {pastOrder.items?.length || 1} items
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <span className="font-bold text-foreground text-sm">
                        Rs. {Number(pastOrder.totalAmount || 0).toLocaleString('en-PK')}
                      </span>
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', getStatusBadgeClass(pastOrder.status, pastOrder.isDraft))}>
                        {pastOrder.isDraft ? 'Draft' : normalizeOrderStatus(pastOrder.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ════════ RIGHT COLUMN (5 COLS) ════════ */}
        <div className="lg:col-span-5 space-y-8">
          {/* Card: Unified Complete Order & Courier History */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <History className="size-4" />
                </div>
                <span>Order Timeline</span>
              </div>
              {hasNocTracking && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSyncStatus}
                  disabled={isSyncing}
                  className="h-8 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Refresh Timeline from Courier"
                >
                  <RotateCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              )}
            </div>

            {/* Courier Booking & Tracking Info Box */}
            {hasNocTracking ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    Courier: {order.courierName || 'NOC Express'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-xs bg-muted text-foreground border border-border">
                    {(() => {
                      const raw = order.nocStatus || '';
                      if (raw && !raw.match(/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
                        return raw;
                      }
                      return order.status === 'Delivered' ? 'Delivered' : (order.status === 'Out For Delivery' ? 'INTRANSIT' : 'Booked');
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block">NOC CN:</span>
                    <span className="font-mono font-bold text-foreground text-sm">{order.nocParcelNo || order.trackingNumber || '—'}</span>
                  </div>
                  {order.nocThirdPartyNo && (
                    <div>
                      <span className="text-muted-foreground block">3rd Party CN:</span>
                      <span className="font-mono font-bold text-foreground text-sm">{order.nocThirdPartyNo}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>Account: {order.nocAccountId === 'portal_2' ? 'Portal 2 (Secondary)' : 'Portal 1 (Main)'}</span>
                  {effectiveTracking && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(effectiveTracking, 'Tracking Number')}
                      className="text-foreground font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'Tracking Number' ? 'Copied' : 'Copy Tracking'}
                    </button>
                  )}
                </div>

                {order.nocStatusTime && (
                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                    <span>Status Updated:</span>
                    <span className="font-semibold text-foreground">
                      {order.nocStatusTime} <span className="font-normal text-muted-foreground">({formatSmartTimeAgo(order.nocStatusTime)})</span>
                    </span>
                  </div>
                )}

                {/* Tracking Action Buttons */}
                <div className="pt-2.5 border-t border-border flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTrackingInitialMode('admin');
                      setTrackingModalOpen(true);
                    }}
                    className="flex-1 h-8.5 text-xs font-medium rounded-lg border-border hover:bg-muted text-foreground cursor-pointer"
                  >
                    <Truck className="size-3.5 mr-1.5 text-muted-foreground" />
                    Live Tracking
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTrackingInitialMode('customer');
                      setTrackingModalOpen(true);
                    }}
                    className="flex-1 h-8.5 text-xs font-medium rounded-lg border-border hover:bg-muted text-foreground cursor-pointer"
                  >
                    <Eye className="size-3.5 mr-1.5 text-muted-foreground" />
                    Customer View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNocStatus}
                    disabled={isSyncingNoc}
                    title="Refresh status from NOC portal"
                    className="h-8.5 px-2.5 text-xs font-medium rounded-lg border-border hover:bg-muted text-foreground cursor-pointer shrink-0"
                  >
                    <RotateCcw className={cn("size-3.5", isSyncingNoc && "animate-spin")} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground space-y-3">
                <Package className="size-8 mx-auto text-muted-foreground opacity-60" />
                <p className="text-xs text-muted-foreground">Not yet booked with courier partner.</p>
                <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setBookingModalOpen(true)}
                    className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" />
                    <span>Book Courier</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenCheckNocModal}
                    className="h-8.5 px-3.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Search className="size-3.5 text-muted-foreground" />
                    <span>Check Order in NOC</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNocStatus}
                    disabled={isSyncingNoc}
                    className="h-8.5 px-3.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className={cn("size-3.5 text-muted-foreground", isSyncingNoc && "animate-spin")} />
                    <span>{isSyncingNoc ? 'Syncing...' : 'Quick Sync'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Vertical Timeline Steps (Clean, unboxed flow) */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {combinedTimeline.map((step, idx) => {
                const isDelivered = step.title.toLowerCase().includes('deliver') || step.title.toLowerCase().includes('payment');
                const stepRelative = step.timestamp ? formatSmartTimeAgo(step.timestamp) : (step.time ? formatSmartTimeAgo(step.time) : '');

                return (
                  <div key={step.id || idx} className="relative group">
                    {/* Bullet icon */}
                    <div className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background">
                      {isDelivered ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : (
                        <div className="size-1.5 rounded-full bg-foreground" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-foreground">
                          {step.title}
                        </span>
                        {step.time && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground font-mono">
                              {step.time}
                            </span>
                            {stepRelative && (
                              <span className="text-[10px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                                {stepRelative}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {step.remarks && step.remarks !== '---' && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.remarks}
                        </p>
                      )}

                      {step.author && (
                        <div className="text-xs text-muted-foreground/80 pt-0.5">
                          <span>{step.author}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Dialog 1: Edit Order Modal (Up to Packed status) ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Pencil className="size-4" />
              Edit Order {order.orderId}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify customer information, delivery address, and status. (Available before shipping)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOrderEdit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Customer Name</label>
                <input
                  type="text"
                  value={editFormData.customerName}
                  onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                <input
                  type="text"
                  value={editFormData.customerPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-hidden focus:border-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">City</label>
                <input
                  type="text"
                  list="city-suggestions"
                  value={editFormData.customerCity}
                  onChange={(e) => setEditFormData({ ...editFormData, customerCity: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                  placeholder="e.g. Peshawar"
                  required
                />
                <datalist id="city-suggestions">
                  {PAKISTAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Order Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                >
                  <option value="Draft">Draft</option>
                  <option value="Order Confirmed">Order Confirmed</option>
                  <option value="In Process">In Process</option>
                  <option value="Packed">Packed</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-foreground">Delivery Address</label>
                <textarea
                  rows={2}
                  value={editFormData.customerAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, customerAddress: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Landmark (Optional)</label>
                <input
                  type="text"
                  value={editFormData.landmark}
                  onChange={(e) => setEditFormData({ ...editFormData, landmark: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                  placeholder="Near clock tower / plaza"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Manual COD Amount (Rs.)</label>
                <input
                  type="number"
                  value={editFormData.manualCodAmount}
                  onChange={(e) => setEditFormData({ ...editFormData, manualCodAmount: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-hidden focus:border-foreground"
                  placeholder={String(order.totalAmount)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Order Origin / Type</label>
                <select
                  value={editFormData.orderType}
                  onChange={(e) => setEditFormData({ ...editFormData, orderType: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                >
                  <option value="Online">Online (Website)</option>
                  <option value="Admin">Admin (Manual / Custom)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Source / Channel Tag</label>
                <input
                  type="text"
                  value={editFormData.sourceTag}
                  onChange={(e) => setEditFormData({ ...editFormData, sourceTag: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                  placeholder="e.g. WhatsApp, Phone, Walk-in"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-foreground">Notes / Instructions</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:border-foreground"
                  placeholder="Special instructions..."
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg h-9 px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingEdit}
                className="rounded-lg h-9 px-5 text-xs font-bold cursor-pointer"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: NOC Booking Modal ── */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Book Order with Courier</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Select the courier account to generate parcel consignment for {order.orderId}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {enableSecondaryNoc ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Courier Account:</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {NOC_PORTALS.map((portal) => {
                    const isSelected = selectedPortal === portal.id;
                    return (
                      <button
                        key={portal.id}
                        type="button"
                        onClick={() => setSelectedPortal(portal.id)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-muted text-foreground font-bold'
                            : 'border-border bg-card text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="text-sm">{portal.name}</span>
                        {isSelected && (
                          <span className="text-xs font-semibold text-foreground bg-background border border-border px-2.5 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-sm flex items-center justify-between">
                <span className="font-semibold text-foreground">Courier Account:</span>
                <span className="font-bold text-foreground bg-background px-3 py-1 rounded-md border border-border text-xs">
                  Main Account (Portal 1)
                </span>
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consignee:</span>
                <span className="font-semibold text-foreground">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City:</span>
                <span className="font-semibold text-foreground">{order.customerCity || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">COD Amount:</span>
                <span className="font-bold text-foreground">Rs. {Number(order.manualCodAmount ?? order.totalAmount ?? 0).toLocaleString('en-PK')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBookingModalOpen(false)}
              className="rounded-lg h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBookNoc}
              disabled={isBooking}
              className="rounded-lg h-9 px-5 text-xs font-bold cursor-pointer"
            >
              {isBooking ? 'Booking...' : 'Confirm & Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Live NOC Tracking Modal ── */}
      <NocTrackingModal
        open={trackingModalOpen}
        onOpenChange={setTrackingModalOpen}
        trackingNumber={effectiveTracking}
        orderId={order.orderId}
        courierName={order.courierName || 'NOC'}
        nocLabelUrl={order.nocLabelUrl}
        isAdmin={true}
        initialMode={trackingInitialMode}
      />

      {/* ── Dialog 4: Move to Trash Confirmation ── */}
      <Dialog open={trashModalOpen} onOpenChange={setTrashModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Move Order to Trash?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              Are you sure you want to move order <strong>{order.orderId}</strong> to Trash? You can restore it later from the Trash tab.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTrashModalOpen(false)}
              className="rounded-lg h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleTrashOrder}
              disabled={isTrashing}
              className="rounded-lg h-9 px-4 text-xs font-bold cursor-pointer"
            >
              {isTrashing ? 'Moving...' : 'Move to Trash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 5: Smart Check & Link NOC Booking Modal ── */}
      <Dialog open={checkNocModalOpen} onOpenChange={setCheckNocModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 rounded-2xl overflow-hidden border border-border shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center">
                  <Search className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Check Order in NOC Portal
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Search bookings on shipnoc.com for <span className="font-semibold text-foreground">{order.customerName}</span> ({order.customerCity || 'N/A'})
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Portal Switcher & Refresh Bar */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">Account:</span>
                {[
                  { id: 'all', label: 'All Accounts' },
                  { id: 'portal_1', label: 'Main (Portal 1)' },
                  { id: 'portal_2', label: 'Secondary (Portal 2)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedSearchPortal(p.id);
                      handleRefreshNocSearch(p.id);
                    }}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer',
                      selectedSearchPortal === p.id
                        ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleRefreshNocSearch()}
                disabled={isSearchingNoc}
                className="h-7 text-xs px-2.5 gap-1 font-medium cursor-pointer"
              >
                <RotateCcw className={cn("size-3", isSearchingNoc && "animate-spin")} />
                <span>{isSearchingNoc ? 'Searching...' : 'Refresh'}</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Matches List Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isSearchingNoc ? (
              <div className="py-12 text-center space-y-3">
                <RotateCcw className="size-7 mx-auto text-sky-600 animate-spin opacity-80" />
                <p className="text-sm font-medium text-foreground">Searching NOC Portal Dashboard...</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Connecting to shipnoc.com and checking recent active bookings for this customer...
                </p>
              </div>
            ) : nocCandidateMatches.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Found {nocCandidateMatches.length} Candidate Booking{nocCandidateMatches.length === 1 ? '' : 's'}:
                  </span>
                  <span>Active & Recent bookings highlighted</span>
                </div>

                {nocCandidateMatches.map((cand, idx) => {
                  const isLinkingThis = linkingParcelNo === cand.parcelNo;
                  return (
                    <div
                      key={cand.parcelNo || idx}
                      className={cn(
                        'p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5',
                        cand.isAlreadyLinked
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : cand.isRecent
                          ? 'border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50'
                          : 'border-border bg-card hover:border-border/80'
                      )}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-foreground">
                            CN: {cand.parcelNo}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                            {cand.courier || 'NOC'}
                          </span>
                          {cand.thirdPartyNo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              3rd Party: {cand.thirdPartyNo}
                            </span>
                          )}
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                              cand.isRecent
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {cand.status || 'Booked'}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span>Consignee: <strong className="text-foreground">{cand.consignee || order.customerName}</strong></span>
                          <span>City: <strong className="text-foreground">{cand.city || order.customerCity || 'N/A'}</strong></span>
                          {cand.statusDate && <span>Date: <strong>{cand.statusDate}</strong></span>}
                        </div>

                        {cand.matchReasons?.length > 0 && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {cand.matchReasons.join(' • ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={`https://shipnoc.com/PrintAirWayBill.aspx?ParcelNo=${cand.parcelNo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium inline-flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" />
                          <span>Slip</span>
                        </a>

                        <Button
                          type="button"
                          size="sm"
                          disabled={Boolean(linkingParcelNo) || cand.isAlreadyLinked}
                          onClick={() => handleLinkNocCandidate(cand)}
                          className={cn(
                            'h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer',
                            cand.isAlreadyLinked ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'
                          )}
                        >
                          <Link2 className={cn("size-3.5", isLinkingThis && "animate-spin")} />
                          <span>{cand.isAlreadyLinked ? 'Already Linked' : isLinkingThis ? 'Linking...' : 'Link & Sync'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 rounded-xl border border-dashed border-border p-6 bg-muted/10">
                <Package className="size-8 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm font-semibold text-foreground">No automatic booking matches found</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  No active booking for &quot;{order.customerName}&quot; was found in the recent NOC portal dashboard. If you have the parcel number / CN directly, you can link it below:
                </p>
              </div>
            )}

            {/* Manual CN Input Fallback Section */}
            <div className="mt-4 pt-4 border-t border-border space-y-2.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Link2 className="size-3.5 text-sky-600" />
                <span>Or Link Directly with Parcel Number / Tracking No:</span>
              </p>
              <form onSubmit={handleManualLinkSubmit} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={manualParcelInput}
                  onChange={(e) => setManualParcelInput(e.target.value)}
                  placeholder="e.g. 16216206417422 or TCS/Leopard CN"
                  className="flex-1 h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <select
                  value={manualCourierPartner}
                  onChange={(e) => setManualCourierPartner(e.target.value)}
                  className="h-9 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none"
                >
                  <option value="NOC Express">NOC Express</option>
                  <option value="Leopard">Leopard</option>
                  <option value="TCS">TCS</option>
                  <option value="Trax">Trax</option>
                  <option value="Call Courier">Call Courier</option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualParcelInput.trim() || Boolean(linkingParcelNo)}
                  className="h-9 px-4 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer"
                >
                  {linkingParcelNo ? 'Linking...' : 'Link Parcel'}
                </Button>
              </form>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Linking will set status to <strong>Shipped</strong> and pull live tracking.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCheckNocModalOpen(false)}
              className="rounded-lg h-8 px-4 text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


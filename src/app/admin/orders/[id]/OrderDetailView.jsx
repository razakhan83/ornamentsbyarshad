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
  Printer,
  FileText,
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
  Pencil,
  Globe,
  UserCog,
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
import { normalizeOrderStatus, getOrderOriginInfo, ORDER_STATUSES } from '@/lib/order-status';
import { updateOrderAction } from '@/app/actions/order.actions';
import { PAKISTAN_CITIES } from '@/lib/cities';
import { formatSmartTimeAgo, formatFullDateTime } from '@/lib/timeAgo';
import { openPrintWindow, writePrintWindow, formatPrintCurrency, escapeHtml } from '../orderPrintUtils';

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
    normalizedStatus.includes('return') ||
    normalizedStatus === 'cancelled'
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

const EDITABLE_STATUSES = ['Draft', 'Order Confirmed', 'In Process', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Returned'];

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
}) {
  const router = useRouter();

  // Interactive States
  const [copiedField, setCopiedField] = useState(null);
  const [trashModalOpen, setTrashModalOpen] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Quick Status Update
  const handleQuickStatusChange = async (newStatus) => {
    if (isUpdatingStatus || newStatus === order.status) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateOrderAction(order._id, { status: newStatus });
      if (res?.success) {
        toast.success(`Status updated to ${newStatus}`);
        router.refresh();
      } else {
        toast.error(res?.error || 'Failed to update order status');
      }
    } catch {
      toast.error('Network error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);

    try {
      const payload = {
        customerName: editFormData.customerName.trim(),
        customerPhone: editFormData.customerPhone.trim(),
        customerCity: editFormData.customerCity.trim(),
        customerAddress: editFormData.customerAddress.trim(),
        landmark: editFormData.landmark.trim(),
        status: editFormData.status,
        manualCodAmount: editFormData.manualCodAmount !== '' ? Number(editFormData.manualCodAmount) : null,
        notes: editFormData.notes.trim(),
        sourceTag: editFormData.sourceTag.trim(),
      };

      const result = await updateOrderAction(order._id, payload);
      if (result.success) {
        toast.success('Order details updated successfully!');
        setEditModalOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update order');
      }
    } catch (err) {
      console.error('Failed to update order:', err);
      toast.error('Network error while updating order');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Move to Trash
  const handleMoveToTrash = async () => {
    setIsTrashing(true);
    try {
      const res = await fetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order._id] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order ${order.orderId} moved to Trash`);
        setTrashModalOpen(false);
        router.push('/admin/orders');
      } else {
        toast.error(data.error || 'Failed to move order to trash');
      }
    } catch {
      toast.error('Network error moving order to trash');
    } finally {
      setIsTrashing(false);
    }
  };

  // Print Customer Invoice
  const handlePrintInvoice = () => {
    const printWindow = openPrintWindow();
    if (!printWindow) {
      toast.error('Please allow popups to print invoices.');
      return;
    }

    const itemsHtml = (order.items || [])
      .map(
        (item, i) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 8px; font-size: 13px; color: #64748b;">${i + 1}</td>
            <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: #0f172a;">
              ${escapeHtml(item.name || item.title || 'Product Item')}
              ${item.variant ? `<div style="font-size: 11px; color: #64748b; font-weight: normal;">Variant: ${escapeHtml(item.variant)}</div>` : ''}
              ${item.sku ? `<div style="font-size: 11px; color: #64748b; font-weight: normal;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
            </td>
            <td style="padding: 10px 8px; font-size: 13px; text-align: center; color: #0f172a;">${item.quantity || 1}</td>
            <td style="padding: 10px 8px; font-size: 13px; text-align: right; color: #0f172a;">${formatPrintCurrency(item.price || 0)}</td>
            <td style="padding: 10px 8px; font-size: 13px; text-align: right; font-weight: 600; color: #0f172a;">${formatPrintCurrency((Number(item.price || 0)) * (Number(item.quantity || 1)))}</td>
          </tr>
        `
      )
      .join('');

    const invoiceHtml = `
      <div style="max-width: 750px; margin: 0 auto; padding: 25px; font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; background: #ffffff;">
        <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #0f172a;">ORNAMENTS BY ARSHAD</h1>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Official Sales Receipt & Invoice</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 800; font-family: monospace; color: #0f172a;">${order.orderId}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px;">Payment: ${order.paymentStatus || 'COD'}</div>
          </div>
        </header>

        <section style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 28px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <div>
            <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 6px 0;">Billed & Shipped To:</h3>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${escapeHtml(order.customerName || 'N/A')}</div>
            <div style="font-size: 13px; color: #334155; margin-top: 4px;">Phone: ${escapeHtml(order.customerPhone || 'N/A')}</div>
            <div style="font-size: 13px; color: #334155; margin-top: 4px; max-width: 320px;">Address: ${escapeHtml(order.customerAddress || 'N/A')}${order.landmark ? ` (${escapeHtml(order.landmark)})` : ''}</div>
            <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 4px;">City: ${escapeHtml(order.customerCity || 'N/A')}</div>
          </div>
        </section>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; width: 35px;">#</th>
              <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left;">Item Description</th>
              <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: center; width: 60px;">Qty</th>
              <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; width: 110px;">Unit Price</th>
              <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: right; width: 110px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
          <div style="width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 8px;">
              <span>Subtotal:</span>
              <span>${formatPrintCurrency(order.totalAmount)}</span>
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

  const formattedPhone = formatPakistaniPhone(order.customerPhone);
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Salam ${order.customerName || 'Customer'}, regarding your Order ${order.orderId} from Ornaments by Arshad:`)}`
    : null;
  const callUrl = order.customerPhone ? `tel:${order.customerPhone}` : null;

  // Build unified chronological timeline
  const combinedTimeline = [];

  // Add Order Activity Logs
  if (Array.isArray(logs) && logs.length > 0) {
    logs.forEach((log) => {
      combinedTimeline.push({
        id: `log-${log._id}`,
        title: log.action ? log.action.replace(/_/g, ' ') : 'Order Update',
        time: log.createdAt ? new Date(log.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '',
        remarks: log.details || '',
        author: log.adminName || log.adminEmail ? `By ${log.adminName || log.adminEmail}` : 'System',
        timestamp: log.createdAt ? new Date(log.createdAt).getTime() : 0,
      });
    });
  }

  // Fallback Initial Log if empty
  if (combinedTimeline.length === 0 && order.createdAt) {
    combinedTimeline.push({
      id: 'order-created',
      title: 'Order Placed',
      time: new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }),
      remarks: `Order created for Rs. ${order.totalAmount.toLocaleString('en-PK')}`,
      author: order.sourceTag ? `Source: ${order.sourceTag}` : 'Store Checkout',
      timestamp: new Date(order.createdAt).getTime(),
    });
  }

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
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border', getStatusBadgeClass(order.status, order.isDraft))}>
              {order.isDraft ? 'Draft' : normalizeOrderStatus(order.status)}
            </span>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
              {order.paymentStatus === 'Paid' ? 'Paid' : 'COD'}
            </span>

            {order.sourceTag && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                <Store className="size-3.5" />
                {order.sourceTag}
              </span>
            )}

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

      {/* ── Main 2-Column Grid ── */}
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

          {/* Card 2: Items Breakdown */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Package className="size-4" />
                </div>
                <span>Ordered Items</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {(order.items || []).length} Item(s)
              </span>
            </div>

            <div className="divide-y divide-border">
              {(order.items || []).map((item, idx) => (
                <div key={item._id || idx} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  {item.image && (
                    <div className="relative size-16 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name || 'Product'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-bold text-foreground text-sm leading-tight">
                      {item.name || item.title || 'Product'}
                    </p>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground font-medium">
                        Variant: {item.variant}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-muted-foreground font-mono">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-sm">
                      Rs. {Number((item.price || 0) * (item.quantity || 1)).toLocaleString('en-PK')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity || 1} × Rs. {Number(item.price || 0).toLocaleString('en-PK')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Amount</span>
                <span className="font-bold text-foreground text-base">
                  Rs. {Number(order.totalAmount || 0).toLocaleString('en-PK')}
                </span>
              </div>
              {order.manualCodAmount != null && order.manualCodAmount !== '' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Custom COD Amount</span>
                  <span className="font-bold text-foreground text-base">
                    Rs. {Number(order.manualCodAmount).toLocaleString('en-PK')}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Previous Orders by Customer */}
          {customerOtherOrders.length > 0 && (
            <section className="rounded-xl bg-card border border-border p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  Past Orders by This Customer ({customerOtherOrders.length})
                </span>
              </div>
              <div className="divide-y divide-border">
                {customerOtherOrders.map((past) => (
                  <Link
                    key={past._id}
                    href={`/admin/orders/${past._id}`}
                    className="py-2.5 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-sm text-foreground hover:underline">
                        {past.orderId}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatSmartTimeAgo(past.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        Rs. {Number(past.totalAmount || 0).toLocaleString('en-PK')}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold border', getStatusBadgeClass(past.status, past.isDraft))}>
                        {past.isDraft ? 'Draft' : normalizeOrderStatus(past.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ════════ RIGHT COLUMN (5 COLS) ════════ */}
        <div className="lg:col-span-5 space-y-8">
          {/* Card: Status Controls */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <span className="font-bold text-foreground text-base flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Change Order Status
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {ORDER_STATUSES.filter(s => s !== 'all' && s !== 'draft').map((st) => (
                <Button
                  key={st}
                  type="button"
                  variant={order.status === st ? 'default' : 'outline'}
                  size="sm"
                  disabled={isUpdatingStatus || order.status === st}
                  onClick={() => handleQuickStatusChange(st)}
                  className={cn(
                    'h-9 text-xs font-semibold rounded-lg justify-start px-3 transition-all cursor-pointer',
                    order.status === st && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {st}
                </Button>
              ))}
            </div>
          </section>

          {/* Card: Order History Timeline */}
          <section className="rounded-xl bg-card border border-border p-6 space-y-6 sticky top-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3 text-foreground font-bold text-base">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <History className="size-4" />
                </div>
                <span>Order Timeline</span>
              </div>
            </div>

            {/* Vertical Timeline Steps */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {combinedTimeline.map((step, idx) => (
                <div key={step.id || idx} className="relative group">
                  <div className="absolute -left-6 top-1 flex size-5 items-center justify-center rounded-full border border-border bg-background">
                    <div className="size-1.5 rounded-full bg-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-foreground">
                        {step.title}
                      </span>
                      {step.time && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {step.time}
                        </span>
                      )}
                    </div>
                    {step.remarks && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.remarks}
                      </p>
                    )}
                    {step.author && (
                      <span className="text-[11px] text-muted-foreground/70 block">
                        {step.author}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Order Details
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Customer Name</label>
              <input
                type="text"
                value={editFormData.customerName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editFormData.customerPhone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">City</label>
                <input
                  type="text"
                  list="pakistan-cities"
                  value={editFormData.customerCity}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, customerCity: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="pakistan-cities">
                  {PAKISTAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Delivery Address</label>
              <textarea
                value={editFormData.customerAddress}
                onChange={(e) => setEditFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Landmark</label>
                <input
                  type="text"
                  value={editFormData.landmark}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, landmark: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Custom COD (PKR)</label>
                <input
                  type="number"
                  value={editFormData.manualCodAmount}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, manualCodAmount: e.target.value }))}
                  placeholder={String(order.totalAmount)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Notes</label>
              <textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[50px]"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2.5 pt-3">
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

      {/* ── Move to Trash Modal ── */}
      <Dialog open={trashModalOpen} onOpenChange={setTrashModalOpen}>
        <DialogContent className="sm:max-w-md rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Move Order to Trash?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              Are you sure you want to move order <strong>{order.orderId}</strong> to Trash?
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
              onClick={handleMoveToTrash}
              disabled={isTrashing}
              className="rounded-lg h-9 px-5 text-xs font-bold cursor-pointer"
            >
              {isTrashing ? 'Moving...' : 'Move to Trash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

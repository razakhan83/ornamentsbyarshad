'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import InvoiceFormClient from './InvoiceFormClient';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ShoppingCart,
  Send,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  deleteInvoiceAction,
  restoreInvoiceAction,
  bulkMarkInvoicesSentAction,
  bulkDeleteInvoicesAction,
  bulkRestoreInvoicesAction,
  emptyInvoiceTrashAction,
} from '@/app/actions/invoice.actions';

export default function AdminInvoicesClient({ initialData }) {
  const [invoices, setInvoices] = useState(initialData?.invoices || []);
  const [stats, setStats] = useState(initialData?.stats || { totalUnpaid: 0, draftCount: 0, sentCount: 0, trashCount: 0 });
  const [totalCount, setTotalCount] = useState(initialData?.totalCount || 0);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPanel, setShowNewPanel] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
        search: search.trim(),
      });
      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      const data = await res.json();
      if (data?.invoices) {
        setInvoices(data.invoices);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
      setSelectedIds([]);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkMarkSent = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      const res = await bulkMarkInvoicesSentAction(selectedIds);
      if (res.success) {
        toast.success(`${res.count} invoices marked as Sent`);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark as sent');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to move ${selectedIds.length} invoices (and linked orders) to trash?`)) return;
    try {
      setIsBulkProcessing(true);
      const res = await bulkDeleteInvoicesAction(selectedIds);
      if (res.success) {
        toast.success(`${res.count} invoices moved to trash`);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to move to trash');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      const res = await bulkRestoreInvoicesAction(selectedIds);
      if (res.success) {
        toast.success(`${res.count} invoices restored`);
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to restore invoices');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleDelete = async (id, num) => {
    if (!confirm(`Are you sure you want to move invoice ${num} to trash?`)) return;
    try {
      await deleteInvoiceAction(id);
      toast.success(`Invoice ${num} moved to trash`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  const handleRestore = async (id, num) => {
    try {
      await restoreInvoiceAction(id);
      toast.success(`Invoice ${num} restored`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to restore invoice');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently delete all invoices in trash? This cannot be undone.')) return;
    try {
      setIsBulkProcessing(true);
      const res = await emptyInvoiceTrashAction();
      toast.success(`${res.deletedCount} invoices deleted permanently`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Failed to empty trash');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            DRAFT
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            SENT
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            PARTIALLY PAID
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            PAID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-border bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dStr) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const isTrashView = statusFilter === 'TRASH';

  const filterTabs = [
    { key: 'ALL', label: 'All Invoices' },
    { key: 'DRAFT', label: 'Draft', count: stats.draftCount },
    { key: 'SENT', label: 'Sent', count: stats.sentCount },
    { key: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { key: 'PAID', label: 'Paid' },
    { key: 'TRASH', label: 'Trash', count: stats.trashCount },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto admin-page-stack">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted/50 text-foreground border border-border">
              <FileSpreadsheet className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                All Invoices
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage store invoices, payments, and 2-way synced customer orders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/orders">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs border-border cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Orders Management
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowNewPanel(true)}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* ── Stats Overview Cards (Exact Dashboard Theme) ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Card 1: Total Unpaid Balance */}
        <div className="admin-surface rounded-[0.5rem] border-transparent p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Unpaid Balance
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums truncate">
                PKR {Number(stats.totalUnpaid || 0).toLocaleString('en-PK')}
              </h3>
            </div>
            <div className="flex size-6 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <DollarSign className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 2: Draft Invoices */}
        <div className="admin-surface rounded-[0.5rem] border-transparent p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Draft Invoices
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums truncate">
                {stats.draftCount || 0}
              </h3>
            </div>
            <div className="flex size-6 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <Clock className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 3: Sent Invoices */}
        <div className="admin-surface rounded-[0.5rem] border-transparent p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Sent Invoices
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums truncate">
                {stats.sentCount || 0}
              </h3>
            </div>
            <div className="flex size-6 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <Send className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 4: Total Invoices */}
        <div className="admin-surface rounded-[0.5rem] border-transparent p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Total Invoices
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums truncate">
                {totalCount || 0}
              </h3>
            </div>
            <div className="flex size-6 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <Layers className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Invoice#, Customer, Phone..."
              className="pl-8 h-9 text-xs rounded-lg border-border shadow-none"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchInvoices}
            className="h-9 w-9 rounded-lg border-border hover:bg-muted shadow-none cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Bulk Actions Floating Toolbar (When Items Selected) ── */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-zinc-900 text-white rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2 py-0.5 bg-white/20 rounded-md">{selectedIds.length} Selected</span>
          </div>

          <div className="flex items-center gap-2">
            {!isTrashView ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkProcessing}
                  onClick={handleBulkMarkSent}
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Mark as Sent
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isBulkProcessing}
                  onClick={handleBulkDelete}
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Move to Trash
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkProcessing}
                  onClick={handleBulkRestore}
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isBulkProcessing}
                  onClick={handleEmptyTrash}
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Empty Trash
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Invoices Desktop Table ── */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedIds.length === invoices.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-ring h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Linked Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {isLoading ? (
                // ── Professional Skeleton Loading Rows ──
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-3 py-3.5 text-center">
                      <div className="h-4 w-4 bg-muted rounded mx-auto"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-muted rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-muted/60 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                      <div className="h-3 bg-muted/60 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-muted/60 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 bg-muted/80 rounded-full w-16"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 bg-muted rounded w-16 ml-auto"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 bg-muted rounded w-16 ml-auto"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-7 bg-muted/60 rounded-lg w-14 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3 border border-border">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">
                      {isTrashView ? 'Trash is empty' : 'No invoices found'}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {isTrashView
                        ? 'Deleted invoices will appear here.'
                        : 'Try changing your filters or create a new invoice.'}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv._id);
                  return (
                    <tr
                      key={inv._id}
                      className={`transition-colors ${
                        isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(inv._id)}
                          className="rounded border-border text-primary focus:ring-ring h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Invoice # */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/admin/invoices/${inv._id}`}
                          className="font-bold text-foreground hover:underline inline-flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground font-medium">
                        {formatDate(inv.invoiceDate)}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground">{inv.customerName || 'Anonymous'}</div>
                        {inv.customerPhone && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{inv.customerPhone}</div>
                        )}
                      </td>

                      {/* Linked Order */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {inv.orderId ? (
                          <Link
                            href={`/admin/orders?search=${inv.orderId}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[11px] font-medium transition-colors border border-border"
                            title="View Order"
                          >
                            <span>{inv.orderId}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/40 font-medium">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(inv.status)}</td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-semibold text-foreground tabular-nums">
                        PKR {Number(inv.totalAmount || 0).toLocaleString('en-PK')}
                      </td>

                      {/* Balance Due */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right tabular-nums">
                        {Number(inv.balanceDue || 0) === 0 && Number(inv.totalAmount || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                          </span>
                        ) : (
                          <span className="font-bold text-foreground">
                            PKR {Number(inv.balanceDue || 0).toLocaleString('en-PK')}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isTrashView ? (
                            <>
                              <Link href={`/admin/invoices/${inv._id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shadow-none cursor-pointer"
                                  title="View Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(inv._id, inv.invoiceNumber)}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-none cursor-pointer"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestore(inv._id)}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-none cursor-pointer"
                                title="Restore Invoice"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(inv._id, inv.invoiceNumber)}
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-none cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* ── Mobile Invoices Card List (Slide se hata ke direct view me) ── */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`mob-skel-${i}`} className="p-3.5 rounded-xl border border-border bg-card shadow-xs animate-pulse flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            </div>
          ))
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-foreground">
              {isTrashView ? 'Trash is empty' : 'No invoices found'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isTrashView ? 'Deleted invoices will appear here.' : 'Try changing your filters or search.'}
            </p>
          </div>
        ) : (
          invoices.map((inv) => {
            const isSelected = selectedIds.includes(inv._id);
            const isPaid = Number(inv.balanceDue || 0) === 0 && Number(inv.totalAmount || 0) > 0;
            return (
              <div
                key={inv._id}
                className={`p-3.5 rounded-xl border border-border bg-card shadow-xs transition-colors flex flex-col gap-2.5 ${
                  isSelected ? 'bg-muted/40 border-primary/40' : ''
                }`}
              >
                {/* Header: Checkbox + Invoice# + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(inv._id)}
                      className="rounded border-border text-primary focus:ring-ring h-4 w-4 cursor-pointer shrink-0"
                    />
                    <Link
                      href={`/admin/invoices/${inv._id}`}
                      className="font-bold text-sm text-foreground hover:underline inline-flex items-center gap-1.5 truncate"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{inv.invoiceNumber}</span>
                    </Link>
                  </div>
                  <div className="shrink-0">{getStatusBadge(inv.status)}</div>
                </div>

                {/* Customer Info & Date */}
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{inv.customerName || 'Anonymous'}</p>
                    {inv.customerPhone && (
                      <p className="text-[11px] text-muted-foreground">{inv.customerPhone}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-muted-foreground text-[11px]">
                    {formatDate(inv.invoiceDate)}
                  </div>
                </div>

                {/* Linked Order & Amounts Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
                  <div>
                    {inv.orderId ? (
                      <Link
                        href={`/admin/orders?search=${inv.orderId}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-medium border border-border"
                        title="View Order"
                      >
                        <span>{inv.orderId}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Manual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[11px] text-muted-foreground">
                      PKR {Number(inv.totalAmount || 0).toLocaleString('en-PK')}
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <span className="font-bold text-foreground text-xs">
                        Due: PKR {Number(inv.balanceDue || 0).toLocaleString('en-PK')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-border/50">
                  {!isTrashView ? (
                    <>
                      <Link href={`/admin/invoices/${inv._id}`} className="flex-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full h-7 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View Invoice
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(inv._id, inv.invoiceNumber)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(inv._id)}
                        className="flex-1 h-7 text-xs font-medium"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(inv._id, inv.invoiceNumber)}
                        className="h-7 px-2 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination Footer (Visible on both Desktop and Mobile) ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl text-xs text-muted-foreground shadow-xs">
        <div>
          <strong className="text-foreground">{totalCount}</strong> invoices
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2.5 rounded-lg border-border text-xs shadow-none"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
          </Button>
          <span className="text-xs text-foreground px-1 font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 rounded-lg border-border text-xs shadow-none"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* ── Inline New Invoice Slide-over Panel ── */}
      {showNewPanel && (
        <InvoiceFormClient
          isPanelMode
          onPanelClose={() => setShowNewPanel(false)}
          onPanelSuccess={() => {
            setShowNewPanel(false);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}

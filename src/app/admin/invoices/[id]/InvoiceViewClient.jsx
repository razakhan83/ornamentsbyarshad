'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Edit,
  Printer,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  Plus,
  Search,
  RefreshCw,
  Share2,
  ChevronDown,
  Send,
  Image as ImageIcon,
  Download,
  X,
  MoreVertical,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RecordPaymentModal from '@/components/admin/RecordPaymentModal';
import { generateInvoice } from '@/lib/invoice-generator';
import { generateVisualInvoicePdf } from '@/lib/invoice-visual-pdf';
import {
  updateInvoiceStatusAction,
  bulkMarkInvoicesSentAction,
  bulkDeleteInvoicesAction,
  bulkRestoreInvoicesAction,
} from '@/app/actions/invoice.actions';

export default function InvoiceViewClient({ invoice }) {
  const router = useRouter();
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Left sidebar invoices list & filtering
  const [invoicesList, setInvoicesList] = useState([]);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarStatus, setSidebarStatus] = useState('ALL');
  const [isListLoading, setIsListLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState({});
  const [isBulkSidebarProcessing, setIsBulkSidebarProcessing] = useState(false);

  const fetchInvoicesList = useCallback(async (status = sidebarStatus) => {
    try {
      setIsListLoading(true);
      const res = await fetch(`/api/admin/invoices?limit=100&status=${status}`);
      const data = await res.json();
      if (data?.invoices) {
        setInvoicesList(data.invoices);
      }
    } catch {
      // silent
    } finally {
      setIsListLoading(false);
    }
  }, [sidebarStatus]);

  const handleStatusChange = async (newStatus) => {
    try {
      setIsUpdatingStatus(true);
      const res = await updateInvoiceStatusAction(currentInvoice._id, newStatus);
      if (res?.success) {
        setCurrentInvoice((prev) => ({ ...prev, status: newStatus }));
        toast.success(`Invoice status updated to ${newStatus}`);
        fetchInvoicesList(sidebarStatus);
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchInvoicesList(sidebarStatus);
  }, [fetchInvoicesList, sidebarStatus]);

  useEffect(() => {
    if (invoice) {
      setCurrentInvoice(invoice);
    }
  }, [invoice]);

  const handleSidebarStatusSelect = (statusKey) => {
    setSidebarStatus(statusKey);
    setSelectedIds({});
  };

  const formatDate = (dStr) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const renderStatusTag = (inv) => {
    if (inv.isDeleted) {
      return (
        <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400">
          TRASH
        </span>
      );
    }
    if (inv.status === 'PAID') {
      return (
        <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          PAID
        </span>
      );
    }
    if (inv.status === 'SENT') {
      return (
        <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          SENT
        </span>
      );
    }
    if (inv.status === 'PARTIALLY_PAID') {
      return (
        <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          PARTIALLY PAID
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 border shadow-2xs border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
        DRAFT
      </span>
    );
  };

  const filteredSidebarList = invoicesList.filter((inv) => {
    if (!sidebarSearch.trim()) return true;
    const s = sidebarSearch.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.customerName?.toLowerCase().includes(s) ||
      inv.customerPhone?.toLowerCase().includes(s)
    );
  });

  const checkedSidebarIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);

  const handleBulkSidebarMarkSent = async () => {
    if (checkedSidebarIds.length === 0) return;
    try {
      setIsBulkSidebarProcessing(true);
      await bulkMarkInvoicesSentAction(checkedSidebarIds);
      toast.success(`${checkedSidebarIds.length} invoices marked as Sent`);
      setSelectedIds({});
      fetchInvoicesList(sidebarStatus);
      if (checkedSidebarIds.includes(currentInvoice._id)) {
        setCurrentInvoice((prev) => ({ ...prev, status: 'SENT' }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark as sent');
    } finally {
      setIsBulkSidebarProcessing(false);
    }
  };

  const handleBulkSidebarDelete = async () => {
    if (checkedSidebarIds.length === 0) return;
    if (!confirm(`Move ${checkedSidebarIds.length} invoices to trash?`)) return;
    try {
      setIsBulkSidebarProcessing(true);
      await bulkDeleteInvoicesAction(checkedSidebarIds);
      toast.success(`${checkedSidebarIds.length} invoices moved to trash`);
      setSelectedIds({});
      fetchInvoicesList(sidebarStatus);
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoices');
    } finally {
      setIsBulkSidebarProcessing(false);
    }
  };

  const handleBulkSidebarRestore = async () => {
    if (checkedSidebarIds.length === 0) return;
    try {
      setIsBulkSidebarProcessing(true);
      await bulkRestoreInvoicesAction(checkedSidebarIds);
      toast.success(`${checkedSidebarIds.length} invoices restored`);
      setSelectedIds({});
      fetchInvoicesList(sidebarStatus);
    } catch (err) {
      toast.error(err.message || 'Failed to restore invoices');
    } finally {
      setIsBulkSidebarProcessing(false);
    }
  };

  const totalQuantity = (currentInvoice.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. Standard fast text-only PDF
  const handleDownloadStandardPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      toast.info('Generating standard PDF...');
      await generateInvoice(
        {
          orderId: currentInvoice.invoiceNumber,
          totalAmount: currentInvoice.totalAmount,
          customerName: currentInvoice.customerName,
          customerPhone: currentInvoice.customerPhone,
          customerEmail: currentInvoice.customerEmail,
          customerAddress: currentInvoice.customerAddress,
          customerCity: currentInvoice.customerCity,
          items: currentInvoice.items,
          notes: currentInvoice.customerNotes,
          createdAt: currentInvoice.invoiceDate,
          dueDate: currentInvoice.dueDate,
          paymentStatus: currentInvoice.status === 'PAID' ? 'PAID' : 'UNPAID',
        },
        {
          storeName: 'Ornaments by Arshad',
          businessAddress: 'Luxury Jewelry Galleria, Karachi, Pakistan',
          supportEmail: 'support@ornamentsbyarshad.com',
          darkLogoUrl: currentInvoice.storeLogoUrl || '',
        }
      );
      toast.success('Standard PDF downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate standard PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. High-fidelity Visual PDF with Product Images
  const handleDownloadVisualPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      toast.info('Generating visual PDF with product pictures...');
      await generateVisualInvoicePdf('printable-invoice-container', `${currentInvoice.invoiceNumber || 'Invoice'}.pdf`);
      toast.success('Visual PDF with images downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate visual PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const statusLabels = {
    ALL: 'All Invoices',
    DRAFT: 'Draft Invoices',
    SENT: 'Sent Invoices',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid Invoices',
    TRASH: 'Trash',
  };

  // Multi-page chunking (Max 15 items per page)
  const ITEMS_PER_PAGE = 15;
  const allItems = currentInvoice.items || [];
  const itemPages = [];
  if (allItems.length === 0) {
    itemPages.push([]);
  } else {
    for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
      itemPages.push(allItems.slice(i, i + ITEMS_PER_PAGE));
    }
  }

  return (
    <div className="flex flex-row w-full h-[calc(100vh-5.5rem)] border border-gray-200 rounded-xl overflow-hidden bg-white text-gray-900 shadow-sm">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .admin-layout-sidebar,
          .admin-layout-header,
          .print\\:hidden {
            display: none !important;
          }
          #printable-invoice-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .printable-invoice-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #9ca3af !important;
            padding: 8mm 10mm !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
        }

        .sidebar-invoice-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-invoice-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .sidebar-invoice-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .sidebar-invoice-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* 1 & 2. LEFT SIDEBAR */}
      <div className="w-[320px] xl:w-[350px] border-r border-gray-200 bg-white flex flex-col hidden lg:flex print:hidden shrink-0 h-full overflow-hidden">
        {/* Sticky Header with Active Dropdown */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 font-bold text-sm text-gray-900 hover:text-emerald-700 focus:outline-none transition-colors"
              >
                <span>{statusLabels[sidebarStatus] || 'All Invoices'}</span>
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('ALL')}>
                All Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('DRAFT')}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('SENT')}>
                Sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('PARTIALLY_PAID')}>
                Partially Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('PAID')}>
                Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSidebarStatusSelect('TRASH')} className="text-rose-600">
                Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
            {/* Split Green Button (+ / new) */}
            <div className="flex items-center rounded-md bg-emerald-600 text-white overflow-hidden shadow-sm">
              <Link href="/admin/invoices/new" className="px-2.5 py-1 text-xs font-bold hover:bg-emerald-700 flex items-center justify-center">
                +
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="px-1.5 py-1 text-xs border-l border-emerald-500 hover:bg-emerald-700 flex items-center justify-center">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 text-xs">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/invoices/new">New Invoice</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/orders">Go to Orders</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* More Options Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="h-7 w-7 text-gray-600 border-gray-300 hover:bg-gray-50 rounded-md">
                  <span className="font-bold text-xs tracking-widest leading-none">...</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem asChild>
                  <Link href="/admin/invoices">Invoices Table View</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fetchInvoicesList(sidebarStatus)}>
                  Refresh List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bulk Action Bar in Sidebar (If checked) */}
        {checkedSidebarIds.length > 0 && (
          <div className="p-2.5 bg-zinc-900 text-white flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-semibold">{checkedSidebarIds.length} Selected</span>
            <div className="flex items-center gap-1.5">
              {sidebarStatus !== 'TRASH' ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBulkSidebarProcessing}
                    onClick={handleBulkSidebarMarkSent}
                    className="h-6 px-2 text-[11px] bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    Mark Sent
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isBulkSidebarProcessing}
                    onClick={handleBulkSidebarDelete}
                    className="h-6 px-2 text-[11px] bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Trash
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBulkSidebarProcessing}
                  onClick={handleBulkSidebarRestore}
                  className="h-6 px-2 text-[11px] bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  Restore
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-2.5 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <Input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search in Invoices..."
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-scroll divide-y divide-gray-100 sidebar-invoice-scroll">
          {isListLoading ? (
            <div className="p-3 space-y-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50/70 animate-pulse border border-gray-100">
                  <div className="w-3.5 h-3.5 bg-gray-200 rounded-[3px] mt-1 shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-36" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSidebarList.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No invoices found</div>
          ) : (
            filteredSidebarList.map((inv) => {
              const isSelected = inv._id === currentInvoice._id;
              return (
                <div
                  key={inv._id}
                  onClick={() => router.push(`/admin/invoices/${inv._id}`)}
                  className={`w-full text-left px-3.5 py-3.5 text-xs transition-colors flex items-start gap-2.5 border-b border-gray-100 cursor-pointer ${
                    isSelected
                      ? 'bg-[#eff2f9]'
                      : 'hover:bg-gray-50/80 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selectedIds[inv._id])}
                    onChange={(e) => toggleSelect(inv._id, e)}
                    className="mt-1 rounded-[3px] border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-900 text-[14px] sm:text-[14.5px] truncate pr-1">
                        {inv.customerName}
                      </span>
                      <span className="font-normal text-slate-800 text-[14px] sm:text-[14.5px] whitespace-nowrap">
                        PKR{Number(inv.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[12px] sm:text-[12.5px] text-slate-500 flex items-center gap-1.5 font-normal flex-wrap">
                      <span>{inv.invoiceNumber}</span>
                      <span>•</span>
                      <span>{formatDate(inv.invoiceDate)}</span>
                      {inv.customerCity && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">{inv.customerCity}</span>
                        </>
                      )}
                    </div>
                    <div>{renderStatusTag(inv)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3 & 4. RIGHT MAIN AREA */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-zinc-100">
        {/* Sticky Action Bar */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-5 py-2 flex items-center justify-between sticky top-0 z-20 print:hidden shrink-0 min-h-[44px]">
          {/* Back button & Invoice title */}
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 shrink-0 lg:hidden">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 truncate">{currentInvoice.invoiceNumber}</h2>
              <div className="shrink-0">{renderStatusTag(currentInvoice)}</div>
            </div>
          </div>

          {/* Desktop Actions (sm and up) */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            <Link href={`/admin/invoices/${currentInvoice._id}/edit`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-gray-700 hover:bg-gray-100">
                <Edit data-icon="inline-start" className="text-gray-500 w-3.5 h-3.5" />
                Edit
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => toast.info('Share link copied')} className="h-8 gap-1.5 text-xs text-gray-700 hover:bg-gray-100">
              <Share2 data-icon="inline-start" className="text-gray-500 w-3.5 h-3.5" />
              Share
            </Button>

            {/* Dropdown for PDF Downloads: Normal & With Images */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingPdf}
                  className="h-8 gap-1.5 text-xs text-gray-700 bg-white hover:bg-gray-50 border-gray-300"
                >
                  {isGeneratingPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  Download PDF
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuItem onClick={handleDownloadStandardPdf} className="flex items-center gap-2 cursor-pointer py-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="font-semibold">Standard PDF</p>
                    <p className="text-[10px] text-gray-400">Compact text-only format</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadVisualPdf} className="flex items-center gap-2 cursor-pointer py-2 text-emerald-700 font-semibold bg-emerald-50/50">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-800">PDF With Images</p>
                    <p className="text-[10px] text-emerald-600 font-normal">Exact visual replica with product photos</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs text-gray-700 hover:bg-gray-100">
              <Printer data-icon="inline-start" className="text-gray-500 w-3.5 h-3.5" />
              PDF/Print
            </Button>

            {currentInvoice.status === 'DRAFT' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusChange('SENT')}
                className="h-8 gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                <Send data-icon="inline-start" className="w-3.5 h-3.5" />
                Mark As Sent
              </Button>
            ) : currentInvoice.status === 'SENT' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdatingStatus}
                onClick={() => handleStatusChange('DRAFT')}
                className="h-8 gap-1.5 text-xs text-zinc-600 hover:bg-zinc-100 border-zinc-200"
              >
                Set to Draft
              </Button>
            ) : null}

            {currentInvoice.balanceDue > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <DollarSign data-icon="inline-start" className="text-emerald-600 w-3.5 h-3.5" />
                Record Payment
              </Button>
            )}

            {/* Close Button Returning to Invoices Table */}
            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />
            <Link href="/admin/invoices">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md border border-gray-200"
                title="Close & Return to Invoices Table"
              >
                <X className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile Actions (sm:hidden) - Clean Single Line with Quick Actions + Overflow Menu */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {currentInvoice.balanceDue > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="h-8 px-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
              >
                <DollarSign className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
                Pay
              </Button>
            )}

            {/* Quick Download PDF Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs text-gray-700 border-gray-300"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem onClick={handleDownloadStandardPdf} className="flex items-center gap-2 cursor-pointer py-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="font-semibold">Standard PDF</p>
                    <p className="text-[10px] text-gray-400">Compact text-only</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadVisualPdf} className="flex items-center gap-2 cursor-pointer py-2 text-emerald-700 font-semibold bg-emerald-50/50">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-800">PDF With Images</p>
                    <p className="text-[10px] text-emerald-600 font-normal">Exact visual replica</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Overflow Dropdown for other actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 text-gray-600 border-gray-300">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/invoices/${currentInvoice._id}/edit`} className="flex items-center gap-2 cursor-pointer">
                    <Edit className="w-3.5 h-3.5 text-gray-500" />
                    <span>Edit Invoice</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Share link copied')} className="flex items-center gap-2 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint} className="flex items-center gap-2 cursor-pointer">
                  <Printer className="w-3.5 h-3.5 text-gray-500" />
                  <span>PDF / Print</span>
                </DropdownMenuItem>
                {currentInvoice.status === 'DRAFT' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange('SENT')} disabled={isUpdatingStatus} className="flex items-center gap-2 cursor-pointer text-blue-700 font-medium">
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark As Sent</span>
                  </DropdownMenuItem>
                ) : currentInvoice.status === 'SENT' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange('DRAFT')} disabled={isUpdatingStatus} className="flex items-center gap-2 cursor-pointer text-zinc-600">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Set to Draft</span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/invoices" className="flex items-center gap-2 cursor-pointer text-gray-500">
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Canvas with A4 Single Page Sheets */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6 md:p-8 flex flex-col items-center gap-4 sm:gap-6 bg-zinc-100">
          {/* WHAT'S NEXT Banner (Draft mode) */}
          {currentInvoice.status === 'DRAFT' && (
            <div className="w-full max-w-[210mm] p-3 rounded-lg bg-white border border-gray-200 shadow-sm text-xs text-gray-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 font-bold">✨ WHAT&apos;S NEXT?</span>
                <span>Send this Invoice to your customer or mark it as Sent.</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('SENT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                >
                  Send Invoice
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('SENT')}
                  className="text-xs h-7"
                >
                  Mark As Sent
                </Button>
              </div>
            </div>
          )}

          {/* Printable Invoice Container (Matching exact layout of INV-00459.pdf) */}
          <div id="printable-invoice-container" className="w-full flex flex-col items-center gap-6">
            {itemPages.map((pageItems, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === itemPages.length - 1;
              const startIdx = pageIndex * ITEMS_PER_PAGE;

              return (
                <div
                  key={pageIndex}
                  className="printable-invoice-page printable-invoice-container-page relative bg-white text-gray-900 w-full max-w-[210mm] shadow-lg border border-gray-400 p-3.5 sm:p-6 font-sans print:shadow-none print:border-none print:p-0 flex flex-col justify-between overflow-x-auto"
                  style={{ minHeight: '297mm' }}
                >
                  <div className="w-full flex-1">
                    {/* Header: Logo & Address on Far Left, INVOICE title on Right */}
                    {isFirstPage ? (
                      <div className="flex justify-between items-center border-b border-gray-400 pb-1.5 mb-1.5 font-sans">
                        {/* Left Side: Store Logo & Shop Address side-by-side aligned flush to far left */}
                        <div className="flex items-center gap-3 sm:gap-3.5 justify-start">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logo.png"
                            alt="Ornaments by Arshad Logo"
                            className="h-8 sm:h-9 max-h-[38px] w-auto object-contain shrink-0"
                          />
                          <div className="text-[10px] sm:text-[10.5px] text-gray-800 space-y-0 font-sans leading-tight text-left">
                            <p className="font-semibold text-gray-900">Shop No - G29, Ghaziani Mall, Sadar</p>
                            <p className="text-gray-700">Karachi</p>
                            <p className="font-bold text-gray-900">03228252592</p>
                          </div>
                        </div>

                        {/* Right Side: Large Uppercase Sans INVOICE */}
                        <div className="text-right">
                          <h1 className="text-xl sm:text-2xl font-sans font-normal tracking-wide text-gray-900 uppercase">
                            INVOICE
                          </h1>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center border-b border-gray-400 pb-1.5 mb-1.5 font-sans text-xs text-gray-600">
                        <div>
                          <span className="font-bold text-gray-900">{currentInvoice.invoiceNumber}</span> • {currentInvoice.customerName}
                        </div>
                        <div>
                          Page {pageIndex + 1} of {itemPages.length}
                        </div>
                      </div>
                    )}

                    {/* Meta Box Grid: 2-Column Bordered Box (Page 1 only) */}
                    {isFirstPage && (
                      <div className="border border-gray-400 text-[10.5px] font-sans">
                        <div className="grid grid-cols-2 divide-x divide-gray-400 border-b border-gray-400">
                          <div className="p-1.5 space-y-0.5 bg-white">
                            <div className="flex">
                              <span className="font-medium text-gray-700 w-24">Invoice#</span>
                              <span className="font-bold text-gray-900">: {currentInvoice.invoiceNumber}</span>
                            </div>
                            <div className="flex">
                              <span className="font-medium text-gray-700 w-24">Invoice Date</span>
                              <span className="font-bold text-gray-900">: {formatDate(currentInvoice.invoiceDate)}</span>
                            </div>
                          </div>
                          <div className="p-1.5 bg-white">
                            {currentInvoice.salesperson || currentInvoice.salesPerson ? (
                              <div className="flex">
                                <span className="font-medium text-gray-700 w-24">Sales person</span>
                                <span className="font-bold text-gray-900">: {currentInvoice.salesperson || currentInvoice.salesPerson}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Bill To Section — Horizontal Row */}
                        <div className="p-2 bg-white flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-700">Bill To :</span>
                            <span className="font-bold text-gray-900 text-xs sm:text-[13px]">{currentInvoice.customerName}</span>
                          </div>
                          {currentInvoice.customerCity || currentInvoice.customerAddress ? (
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <span className="font-medium text-gray-500">City :</span>
                              <span className="font-semibold text-gray-900">
                                {[currentInvoice.customerCity, currentInvoice.customerAddress].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Items Table: Directly attached to meta box (border-t-0) */}
                    <div className="border-x border-b border-gray-400 overflow-x-auto">
                      <table className="w-full min-w-[340px] sm:min-w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50/70 border-b border-gray-400 text-gray-800 font-bold uppercase text-[10px]">
                            <th className="py-2 px-2.5 border-r border-gray-400 w-8 text-center">#</th>
                            <th className="py-2 px-2.5 border-r border-gray-400">Item & Description</th>
                            <th className="py-2 px-2.5 border-r border-gray-400 text-right w-20">Qty</th>
                            <th className="py-2 px-2.5 border-r border-gray-400 text-right w-20">Rate</th>
                            <th className="py-2 px-2.5 text-right w-24">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 text-gray-900">
                          {pageItems.map((item, idx) => {
                            const itemImg = item.image || item.images?.[0]?.url || item.images?.[0] || item.picture || item.img;
                            return (
                              <tr key={idx} className="align-middle">
                                <td className="py-1.5 px-2.5 border-r border-gray-400 text-center font-medium text-gray-600 text-xs">
                                  {startIdx + idx + 1}
                                </td>
                                <td className="py-1.5 px-2.5 border-r border-gray-400">
                                  <div className="flex items-center gap-2.5">
                                    {itemImg ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={itemImg}
                                        alt={item.name}
                                        className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded border border-gray-100 bg-white shrink-0"
                                      />
                                    ) : null}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-gray-900 text-xs sm:text-[12px] leading-snug">{item.name}</p>
                                      {(item.description || item.note) && (
                                        <p className="text-[10px] sm:text-[10.5px] text-gray-600 font-normal mt-0.5 whitespace-pre-line leading-tight">
                                          {item.description || item.note}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-1.5 px-2.5 border-r border-gray-400 text-right font-normal text-xs">
                                  {Number(item.quantity || 1).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 px-2.5 border-r border-gray-400 text-right font-normal text-xs">
                                  {Number(item.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-medium text-xs">
                                  {(Number(item.quantity || 1) * Number(item.price || 0)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer/Totals Box on the Last Page (Directly attached to table) */}
                    {isLastPage && (
                      <div className="flex flex-col sm:flex-row justify-between items-start border-x border-b border-gray-400 text-[10.5px]">
                        {/* Left Side: Items in Total count & Notes */}
                        <div className="p-2.5 space-y-2 max-w-sm text-gray-800">
                          <div className="font-medium text-[10.5px]">
                            Items in Total <span className="font-bold">{totalQuantity.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 text-[10px]">Notes</p>
                            <p className="mt-0.5 text-[10px] text-gray-700 whitespace-pre-line">
                              {currentInvoice.customerNotes || '1. Thank you for choosing us. We look forward to serving you again.'}
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Bordered Box aligning Sub Total, Total, Payment Made, Balance Due */}
                        <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-400 divide-y divide-gray-200">
                          <div className="p-2 flex justify-between text-gray-800">
                            <span>Sub Total</span>
                            <span className="font-normal text-gray-900">
                              {Number(currentInvoice.subtotal || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {currentInvoice.discountAmount > 0 && (
                            <div className="p-2 flex justify-between text-gray-800">
                              <span>Discount</span>
                              <span className="font-normal text-rose-600">
                                (-) {Number(currentInvoice.discountAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {currentInvoice.shippingAmount > 0 && (
                            <div className="p-2 flex justify-between text-gray-800">
                              <span>Shipping</span>
                              <span className="font-normal text-gray-900">
                                {Number(currentInvoice.shippingAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {currentInvoice.previousBalance > 0 && (
                            <div className="p-2 flex justify-between text-gray-800">
                              <span>Previous Balances</span>
                              <span className="font-normal text-gray-900">
                                {Number(currentInvoice.previousBalance || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          <div className="p-2 flex justify-between font-bold text-gray-900">
                            <span>Total</span>
                            <span>PKR{Number(currentInvoice.totalAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                          </div>

                          {(Number(currentInvoice.paidAmount) > 0 || currentInvoice.status === 'PAID') && (
                            <div className="p-2 flex justify-between text-gray-800">
                              <span className="font-medium">Payment Made</span>
                              <span className="font-bold text-red-500">
                                (-) {Number(currentInvoice.paidAmount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          <div className="p-2 flex justify-between font-bold text-gray-900">
                            <span>Balance Due</span>
                            <span>PKR{Number(currentInvoice.balanceDue ?? (currentInvoice.totalAmount - currentInvoice.paidAmount)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payments History Inside Printable Sheet on Last Page */}
                    {isLastPage && currentInvoice.payments && currentInvoice.payments.length > 0 && (
                      <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
                        <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Payment History
                        </h4>
                        <div className="divide-y divide-gray-200 border border-gray-300 rounded overflow-hidden text-[10.5px]">
                          {currentInvoice.payments.map((p) => (
                            <div key={p._id} className="p-1.5 px-2.5 flex justify-between items-center bg-gray-50/70">
                              <div>
                                <span className="font-bold text-gray-900">{p.paymentNumber}</span> • {p.paymentMode}
                                {p.referenceNumber ? ` (${p.referenceNumber})` : ''}
                                <span className="text-[9.5px] text-gray-500 ml-1.5">{formatDate(p.paymentDate)}</span>
                              </div>
                              <div className="font-bold text-emerald-700">
                                + PKR {Number(p.amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        invoice={currentInvoice}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

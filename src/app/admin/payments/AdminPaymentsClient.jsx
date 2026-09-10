'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AdminPaymentsClient({ initialPayments = [] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/payments?limit=100');
      const data = await res.json();
      if (data?.payments) {
        setPayments(data.payments);
      }
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = payments.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.paymentNumber?.toLowerCase().includes(s) ||
      p.invoiceNumber?.toLowerCase().includes(s) ||
      p.customerName?.toLowerCase().includes(s) ||
      p.paymentMode?.toLowerCase().includes(s)
    );
  });

  const totalReceived = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatDate = (dStr) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-6 admin-page-stack">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <CreditCard className="size-6 sm:size-7 text-emerald-600 shrink-0" />
            <span>Payments Received</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Audit history of all customer payments recorded against invoices.
          </p>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-left sm:text-right shrink-0">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Filtered Total Received
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-950">
            PKR {totalReceived.toLocaleString('en-PK')}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Payment#, Invoice#, Customer..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button variant="outline" size="icon" onClick={fetchPayments} className="h-9 w-9">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">PAYMENT#</th>
                <th className="px-4 py-3">DATE</th>
                <th className="px-4 py-3">INVOICE#</th>
                <th className="px-4 py-3">CUSTOMER NAME</th>
                <th className="px-4 py-3">PAYMENT MODE</th>
                <th className="px-4 py-3">REFERENCE/TXN</th>
                <th className="px-4 py-3 text-right">AMOUNT RECEIVED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading payments history...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-900">{p.paymentNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-600">
                      <Link href={`/admin/invoices/${p.invoiceId}`} className="hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{p.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{p.paymentMode}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono">{p.referenceNumber || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                      + PKR {Number(p.amount || 0).toLocaleString('en-PK')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  ShoppingBag,
  Search,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Package,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function formatWhatsAppPhone(phone = '') {
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.slice(1);
  } else if (cleaned.startsWith('3')) {
    cleaned = '92' + cleaned;
  }
  return cleaned;
}

export default function AbandonedCartsClient({ initialCarts = [] }) {
  const [carts, setCarts] = useState(initialCarts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ABANDONED');
  const [loadingId, setLoadingId] = useState(null);

  const filteredCarts = useMemo(() => {
    return carts.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.phone?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [carts, statusFilter, search]);

  const handleUpdateStatus = async (id, nextStatus) => {
    setLoadingId(id);
    try {
      const res = await fetch('/api/admin/abandoned-carts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCarts((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: nextStatus } : item))
        );
        toast.success(`Cart marked as ${nextStatus.toLowerCase()}`);
      } else {
        toast.error(data.error || 'Failed to update cart status');
      }
    } catch {
      toast.error('Network error updating cart');
    } finally {
      setLoadingId(null);
    }
  };

  const getWhatsAppUrl = (cart) => {
    const waNumber = formatWhatsAppPhone(cart.phone);
    const itemList = (cart.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (Qty: ${it.quantity}) - Rs. ${(it.price * it.quantity).toLocaleString('en-PK')}`)
      .join('\n');

    const message = [
      `Assalam-o-Alaikum ${cart.name || 'Customer'}!`,
      '',
      `We noticed you left items in your cart at *China Unique Store*:`,
      itemList,
      '',
      `*Total Value:* Rs. ${Number(cart.totalAmount || 0).toLocaleString('en-PK')}`,
      '',
      `Would you like us to help you complete this order or do you have any questions about delivery / Cash on Delivery?`,
    ].join('\n');

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  };

  const stats = useMemo(() => {
    const active = carts.filter((c) => c.status === 'ABANDONED');
    const recovered = carts.filter((c) => c.status === 'RECOVERED');
    const totalPotential = active.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);

    return {
      activeCount: active.length,
      recoveredCount: recovered.length,
      totalPotential,
    };
  }, [carts]);

  return (
    <div className="admin-page-stack w-full gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Abandoned Carts</h1>
          <p className="text-sm text-muted-foreground">
            Follow up directly via WhatsApp with customers who left items in their checkout cart.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="admin-surface rounded-xl p-4 border border-border/70">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Abandoned Carts</p>
          <h3 className="mt-1 text-2xl font-bold text-amber-600 tabular-nums">{stats.activeCount}</h3>
        </div>
        <div className="admin-surface rounded-xl p-4 border border-border/70">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Potential Revenue</p>
          <h3 className="mt-1 text-2xl font-bold text-foreground tabular-nums">
            Rs. {stats.totalPotential.toLocaleString('en-PK')}
          </h3>
        </div>
        <div className="admin-surface rounded-xl p-4 border border-border/70">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recovered Orders</p>
          <h3 className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{stats.recoveredCount}</h3>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex p-1 bg-muted/60 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'ABANDONED', label: `Abandoned (${stats.activeCount})` },
            { key: 'RECOVERED', label: `Recovered (${stats.recoveredCount})` },
            { key: 'DISMISSED', label: 'Dismissed' },
            { key: 'ALL', label: `All (${carts.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap',
                statusFilter === tab.key
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8.5 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Cart List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredCarts.length === 0 ? (
          <div className="admin-surface rounded-xl p-10 flex flex-col items-center justify-center text-center border border-dashed border-border">
            <ShoppingBag className="size-10 text-muted-foreground/50 mb-2" />
            <h4 className="text-sm font-semibold text-foreground">No abandoned carts found</h4>
            <p className="text-xs text-muted-foreground mt-1">
              When customers enter their contact info on checkout without completing the order, they will appear here.
            </p>
          </div>
        ) : (
          filteredCarts.map((cart) => (
            <div
              key={cart._id}
              className="admin-surface rounded-xl p-4 border border-border/80 hover:border-border transition-all flex flex-col gap-3"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 shrink-0 font-bold text-xs">
                    <User className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {cart.name || 'Anonymous Customer'}
                      </h4>
                      <Badge
                        variant={
                          cart.status === 'RECOVERED'
                            ? 'default'
                            : cart.status === 'ABANDONED'
                            ? 'outline'
                            : 'secondary'
                        }
                        className={cn(
                          'text-[10px] px-2 py-0',
                          cart.status === 'ABANDONED' && 'bg-amber-50 text-amber-800 border-amber-200',
                          cart.status === 'RECOVERED' && 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        )}
                      >
                        {cart.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-emerald-600" />
                        <strong className="text-foreground">{cart.phone}</strong>
                      </span>
                      {cart.city ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {cart.city}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mr-2">
                    <Clock className="size-3" />
                    {new Date(cart.lastActiveAt || cart.updatedAt).toLocaleString('en-PK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>

                  {cart.phone ? (
                    <a
                      href={getWhatsAppUrl(cart)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      <MessageCircle className="size-3.5" />
                      Contact WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Items in cart */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {(cart.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50 text-xs"
                    >
                      <div className="relative size-6 rounded bg-muted overflow-hidden shrink-0">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <Package className="size-3 m-auto text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium text-foreground max-w-[140px] truncate">{item.name}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        x{item.quantity}
                      </Badge>
                      <span className="text-muted-foreground font-semibold tabular-nums">
                        Rs. {(item.price * item.quantity).toLocaleString('en-PK')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Value</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      Rs. {Number(cart.totalAmount || 0).toLocaleString('en-PK')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 border-l border-border/50 pl-3">
                    {cart.status === 'ABANDONED' ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(cart._id, 'RECOVERED')}
                          disabled={loadingId === cart._id}
                          className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2"
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Recovered
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(cart._id, 'DISMISSED')}
                          disabled={loadingId === cart._id}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(cart._id, 'ABANDONED')}
                        disabled={loadingId === cart._id}
                        className="h-7 text-xs text-muted-foreground px-2"
                      >
                        <RefreshCw className="size-3 mr-1" />
                        Re-open
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

const formatPrice = (val) => `PKR ${Number(val || 0).toLocaleString('en-PK')}`;

const formatYAxis = (val) => {
  if (!val || val === 0) return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${Math.round(val / 1000)}k`;
  return `${val}`;
};

export default function DashboardChart({ initialData = [], initialPeriod = 'monthly' }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(Array.isArray(initialData) ? initialData : []);
  const [isLoading, setIsLoading] = useState(!(initialPeriod === 'monthly' && Array.isArray(initialData) && initialData.length > 0));

  useEffect(() => {
    async function fetchChart() {
      if (period === initialPeriod && Array.isArray(initialData) && initialData.length > 0) {
        setData(initialData);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/chart?period=${period}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch chart data (${res.status})`);
        }
        const result = await res.json();
        if (result.success) {
          setData(result.data || []);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchChart();
  }, [initialData, initialPeriod, period]);

  const { totalRevenue, totalOrders, aov } = useMemo(() => {
    const revenue = data.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
    const orders = data.reduce((acc, curr) => acc + (Number(curr.orders) || 0), 0);
    const avg = orders > 0 ? Math.round(revenue / orders) : 0;
    return { totalRevenue: revenue, totalOrders: orders, aov: avg };
  }, [data]);

  return (
    <div className="flex h-full flex-col w-full min-h-[280px]">
      {/* Professional Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-foreground">Revenue Performance</h2>
          </div>
          
          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] mt-1.5">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Total:</span>
              <span className="font-bold text-foreground">{formatPrice(totalRevenue)}</span>
            </div>
            <span className="text-muted-foreground/30">•</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Orders:</span>
              <span className="font-semibold text-foreground">{totalOrders}</span>
            </div>
            {totalOrders > 0 && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>AOV:</span>
                  <span className="font-semibold text-foreground">{formatPrice(aov)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timeframe Toggle Pills */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 self-start sm:self-auto shadow-2xs">
          {[
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'yearly', label: 'Yearly' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                period === item.id
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative flex-1 min-h-[210px] w-full pt-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-xs z-10 rounded-lg">
            <Loader2 className="size-5 animate-spin text-emerald-600" />
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground z-10">
            No revenue recorded for this period
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 10, bottom: 4 }}>
            <defs>
              <linearGradient id="emeraldRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
              tickMargin={10}
              minTickGap={20}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground font-medium"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={54}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground font-medium"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const revenueVal = Number(payload[0]?.payload?.revenue || 0);
                const ordersVal = Number(payload[0]?.payload?.orders || 0);
                const avgVal = ordersVal > 0 ? Math.round(revenueVal / ordersVal) : 0;
                return (
                  <div className="rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-2 min-w-[170px]">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-border/60 text-muted-foreground font-medium">
                      <Calendar className="size-3 text-muted-foreground" />
                      <span className="text-foreground font-bold">{label}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1 text-muted-foreground font-medium">
                          <DollarSign className="size-3 text-emerald-500" />
                          Revenue:
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatPrice(revenueVal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1 text-muted-foreground font-medium">
                          <ShoppingBag className="size-3 text-blue-500" />
                          Orders:
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {ordersVal} {ordersVal === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      {ordersVal > 0 && (
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40 text-[11px]">
                          <span className="text-muted-foreground">Avg / Order:</span>
                          <span className="font-medium text-foreground tabular-nums">
                            {formatPrice(avgVal)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#emeraldRevenueGradient)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

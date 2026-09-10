'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PusherClient from 'pusher-js';
import {
  Users,
  Globe,
  Radio,
  MapPin,
  Clock,
  RefreshCw,
  ExternalLink,
  Activity,
  Calendar,
  TrendingUp,
  BarChart3,
  Flame,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// Lazy-load the map with SSR disabled to prevent SVG hydration mismatch
const LiveVisitorMap = dynamic(() => import('@/components/admin/LiveVisitorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[290px] sm:h-[400px] md:h-[500px] bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs overflow-hidden relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-32 bg-muted/60 rounded-lg animate-pulse" />
          <div className="h-6 w-28 bg-muted/40 rounded-lg animate-pulse hidden sm:block" />
        </div>
        <div className="h-7 w-16 bg-muted/60 rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-600 animate-spin" />
          <span className="text-[11px] font-mono text-muted-foreground">Initializing Radar View...</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="h-3 w-48 bg-muted/50 rounded animate-pulse" />
        <div className="h-3 w-28 bg-muted/40 rounded animate-pulse hidden sm:block" />
      </div>
    </div>
  ),
});

export default function LiveTrafficPage() {
  const [visitors, setVisitors] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [historyData, setHistoryData] = useState({
    todayVisits: 0,
    last7DaysTotal: 0,
    last30DaysTotal: 0,
    trend7Days: [],
    topCities: [],
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch historical analytics
  const fetchTrafficHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/traffic/history');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.stats) {
          setHistoryData(json.stats);
        }
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchTrafficHistory();
  }, [fetchTrafficHistory]);

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

    if (!pusherKey) {
      return;
    }

    let client = null;
    let channel = null;

    try {
      client = new PusherClient(pusherKey, {
        cluster,
        authEndpoint: '/api/pusher/auth?role=admin&city=Admin&country=HQ',
        forceTLS: true,
      });

      // If already connected synchronously
      if (client.connection.state === 'connected') {
        queueMicrotask(() => {
          setConnectionStatus('connected');
        });
      }

      client.connection.bind('state_change', (states) => {
        if (states.current === 'connected') {
          setConnectionStatus('connected');
        } else if (states.current === 'unavailable' || states.current === 'failed') {
          setConnectionStatus('disconnected');
        } else if (states.current === 'connecting') {
          setConnectionStatus('connecting');
        }
      });

      client.connection.bind('connected', () => {
        setConnectionStatus('connected');
      });

      channel = client.subscribe('presence-active-visitors');

      channel.bind('pusher:subscription_succeeded', (members) => {
        setConnectionStatus('connected');
        const list = [];
        members.each((member) => {
          if (member.info) {
            list.push({
              id: member.id,
              name: member.info.role === 'admin' ? 'Admin' : (member.info.name || 'Visitor'),
              isAdmin: member.info.role === 'admin',
              ...member.info,
            });
          }
        });
        setVisitors(list);
      });

      channel.bind('pusher:member_added', (member) => {
        if (!member.info) return;
        setVisitors((prev) => {
          const filtered = prev.filter((m) => m.id !== member.id);
          return [
            ...filtered,
            {
              id: member.id,
              name: member.info.role === 'admin' ? 'Admin' : (member.info.name || 'Visitor'),
              isAdmin: member.info.role === 'admin',
              ...member.info,
            },
          ];
        });
      });

      channel.bind('pusher:member_removed', (member) => {
        setVisitors((prev) => prev.filter((m) => m.id !== member.id));
      });
    } catch {
      queueMicrotask(() => {
        setConnectionStatus('disconnected');
      });
    }

    return () => {
      if (channel) channel.unbind_all();
      if (client) client.disconnect();
    };
  }, []);

  // Aggregated analytics
  const countryBreakdown = useMemo(() => {
    const map = new Map();
    visitors.forEach((v) => {
      const country = v.country || 'Global';
      map.set(country, (map.get(country) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [visitors]);

  const uniqueCitiesCount = useMemo(() => {
    const set = new Set(visitors.map((v) => v.city || 'Unknown'));
    return set.size;
  }, [visitors]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-2.5 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Top Header - Compact & Clean */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Live Traffic
          </h1>
          <Badge
            variant={
              connectionStatus === 'connected'
                ? 'success'
                : connectionStatus === 'unconfigured'
                ? 'warning'
                : 'secondary'
            }
            className="gap-1.5 py-0.5 px-2 text-[11px] sm:text-xs shrink-0"
          >
            <span
              className={`size-1.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : connectionStatus === 'unconfigured'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {connectionStatus === 'connected'
                ? 'Live'
                : connectionStatus === 'unconfigured'
                ? 'Keys Pending'
                : 'Connecting'}
            </span>
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/', '_blank')}
          className="h-8 gap-1.5 px-2.5 text-xs shrink-0 border-border"
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">Storefront</span>
        </Button>
      </div>

      {/* Notice if Pusher keys not yet set */}
      {connectionStatus === 'unconfigured' && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-start gap-3">
            <Radio className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Pusher Channels Configuration Required
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                Add <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-xs">PUSHER_APP_ID</code>,{' '}
                <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_PUSHER_KEY</code>,{' '}
                <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-xs">PUSHER_SECRET</code>, and{' '}
                <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_PUSHER_CLUSTER</code> in your <code className="font-mono">.env.local</code> to activate live Pusher broadcast.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Cards - Clean & Minimal Matching Admin Dashboard */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {/* Card 1: Live Visitors */}
        <div className="admin-surface rounded-[0.5rem] border border-border/80 bg-card p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Live Storefront
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums flex items-baseline gap-1.5">
                {visitors.length}
                <span className="text-[11px] font-normal text-emerald-600">online</span>
              </h3>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <Activity className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 2: Today's Total Visits */}
        <div className="admin-surface rounded-[0.5rem] border border-border/80 bg-card p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Today&apos;s Visits
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {historyData.todayVisits}
              </h3>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <Calendar className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 3: Last 7 Days (Week) */}
        <div className="admin-surface rounded-[0.5rem] border border-border/80 bg-card p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Last 7 Days
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {historyData.last7DaysTotal}
              </h3>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <TrendingUp className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Card 4: Last 30 Days (Month) */}
        <div className="admin-surface rounded-[0.5rem] border border-border/80 bg-card p-3 sm:p-4 transition-colors hover:border-border">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-medium text-muted-foreground line-clamp-1">
                Last 30 Days
              </p>
              <h3 className="mt-0.5 text-lg sm:text-2xl font-bold tracking-[-0.02em] text-foreground tabular-nums">
                {historyData.last30DaysTotal}
              </h3>
            </div>
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-md bg-muted/50 text-foreground shrink-0 ml-2">
              <BarChart3 className="size-3.5 sm:size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Map Section */}
      <LiveVisitorMap visitors={visitors} />

      {/* Analytics & Feed Grid: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Active Sessions Live Table (2 Cols on lg) */}
        <Card className="lg:col-span-2 border bg-card shadow-xs">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live Sessions
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">
                {visitors.length} online
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[240px] sm:h-[280px] w-full">
              {visitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground gap-1.5 p-4 text-center">
                  <Radio className="size-6 stroke-1 text-slate-400 animate-pulse" />
                  <p className="text-xs sm:text-sm font-medium">Waiting for storefront traffic...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs py-2">User</TableHead>
                        <TableHead className="text-xs py-2">Location</TableHead>
                        <TableHead className="text-xs py-2 hidden sm:table-cell">Coordinates</TableHead>
                        <TableHead className="text-xs py-2">Status</TableHead>
                        <TableHead className="text-xs py-2 text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitors.map((v, i) => (
                        <TableRow key={v.id || i}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5">
                              {v.isAdmin ? (
                                <Badge className="bg-purple-600/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-semibold px-1.5 py-0.2">
                                  Admin
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                  <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                                  <span>Visitor</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="size-3 text-emerald-500 shrink-0" />
                              <span className="text-xs font-medium">{v.city || 'Karachi'}, {v.country || 'Pakistan'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                            {Number(v.lat || 0).toFixed(1)}°, {Number(v.lng || 0).toFixed(1)}°
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                              Online
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs text-muted-foreground font-mono">
                            {v.joinedAt ? new Date(v.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Cities Historical Analytics (1 Col on lg) */}
        <Card className="border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-1.5 text-foreground">
                <MapPin className="size-3.5 text-muted-foreground" />
                Top Cities
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchTrafficHistory}
                className="size-6 text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw className="size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ScrollArea className="h-[250px] sm:h-[280px]">
              {historyData.topCities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[230px] text-xs text-muted-foreground gap-1.5 text-center">
                  <Globe className="size-6 text-slate-300 dark:text-slate-700" />
                  <span>No historical city visits logged yet.</span>
                  <span className="text-[11px] text-slate-400">Visitors will be recorded automatically!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-3.5">
                  {historyData.topCities.map((item, idx) => (
                    <div key={`${item.city}-${idx}`} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="size-3 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{item.city}</span>
                          <span className="text-[11px] text-muted-foreground">({item.country})</span>
                        </span>
                        <span className="font-mono text-muted-foreground text-xs shrink-0 ml-2">
                          {item.count} visit{item.count === 1 ? '' : 's'} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

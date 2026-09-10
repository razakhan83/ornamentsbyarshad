'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Bell, ShoppingCart, MessageSquare, UserPlus, Circle, CheckCircle2, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  order: ShoppingCart,
  review: MessageSquare,
  user: UserPlus,
};

const COLOR_MAP = {
  order: 'border border-border bg-muted text-foreground',
  review: 'border border-border bg-muted text-foreground',
  user: 'border border-border bg-muted text-foreground',
};

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminNotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('adminLiveNotifications');
        if (stored !== null) return stored === 'true';
      } catch {}
    }
    return true;
  });
  const lastPoppedTimeRef = useRef(null);

  const handleLiveToggle = (checked) => {
    setLiveEnabled(checked);
    localStorage.setItem('adminLiveNotifications', String(checked));
    if (checked) {
      toast.success('Live notifications enabled', { position: 'top-right' });
    } else {
      toast.info('Live notifications disabled', { position: 'top-right' });
    }
  };

  // Poll every 5 seconds if live is enabled
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/notifications', 
    fetcher, 
    { 
      refreshInterval: liveEnabled ? 30000 : 0,
      revalidateOnFocus: true
    }
  );

  const notifications = data?.success ? data.data : [];
  const loading = isLoading && !data;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (id) => {
    try {
      // Optimistic update
      mutate(
        { ...data, data: notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)) },
        false
      );
      
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (!res.ok) {
        mutate(); // Rollback on error
      }
    } catch {
      mutate();
    }
  }, [data, mutate, notifications]);

  // Detect new notifications and show toast
  useEffect(() => {
    if (!data?.success || !data.data) return;
    const currentNotifications = data.data;

    // Initialize lastPoppedTimeRef from localStorage on first run
    if (lastPoppedTimeRef.current === null) {
      const stored = localStorage.getItem('adminLastPoppedTime');
      if (stored) {
        lastPoppedTimeRef.current = parseInt(stored, 10);
      } else {
        // First time ever loading this component on this browser.
        // Set to the newest notification's time, or 0 if none.
        if (currentNotifications.length > 0) {
          const newestTime = Math.max(...currentNotifications.map(n => new Date(n.createdAt).getTime()));
          lastPoppedTimeRef.current = newestTime;
          localStorage.setItem('adminLastPoppedTime', newestTime.toString());
        } else {
          lastPoppedTimeRef.current = 0;
        }
        return; // Don't toast anything on the very first historical load
      }
    }

    // Now, find all UNREAD notifications that are newer than lastPoppedTime
    const newNotifications = currentNotifications.filter(n => {
      const time = new Date(n.createdAt).getTime();
      return !n.isRead && time > lastPoppedTimeRef.current;
    });

    if (newNotifications.length > 0) {
      let maxTime = lastPoppedTimeRef.current;
      let hasNewUnread = false;

      newNotifications.forEach(notification => {
        const time = new Date(notification.createdAt).getTime();
        if (time > maxTime) maxTime = time;

        if (liveEnabled) {
          hasNewUnread = true;
          const Icon = ICON_MAP[notification.type] || Bell;
          toast(notification.message, {
            icon: <Icon className="size-4" />,
            duration: 5000,
            position: 'top-right',
            action: {
              label: 'View',
              onClick: () => {
                if (notification.link) {
                  router.push(notification.link);
                  markAsRead(notification._id);
                }
              }
            }
          });
        }
      });

      // ALWAYS update the reference and localStorage
      lastPoppedTimeRef.current = maxTime;
      localStorage.setItem('adminLastPoppedTime', maxTime.toString());

      if (liveEnabled && hasNewUnread) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            
            const playTone = (freq, startTime, duration) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
              gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(startTime);
              osc.stop(startTime + duration);
            };
            
            const now = ctx.currentTime;
            playTone(880, now, 0.15);
            playTone(1108.73, now + 0.2, 0.3);
          }
        } catch(e) {
          console.error('Audio play failed', e);
        }
      }
    }
  }, [data, liveEnabled, router, markAsRead]);

  async function handleRefresh() {
    await mutate();
    toast.success('Notifications refreshed', { position: 'top-right' });
  }

  async function markAllRead() {
    try {
      // Optimistic update
      mutate(
        currentData => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.map((n) => ({ ...n, isRead: true }))
          };
        },
        false
      );
      
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      
      if (res.ok) {
        toast.success('All notifications marked as read', { position: 'top-right' });
      }
      
      mutate();
    } catch (error) {
       console.error('Failed to mark all as read', error);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground size-8 md:size-10 relative group rounded-full border border-border/70 bg-background hover:bg-muted/50 shadow-sm">

          <Bell className={cn("size-5 md:size-5 transition-transform group-hover:rotate-12", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 md:right-0 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        
</PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[380px]" align="end" sideOffset={8}>
        <div className="flex flex-col px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-muted text-foreground">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh notifications"
              >
                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                <span className="sr-only">Refresh notifications</span>
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-semibold text-foreground hover:bg-muted"
                  onClick={markAllRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Live notifications toggle */}
          <div className="flex items-center justify-between mt-2.5 rounded-md bg-muted/40 px-2.5 py-1.5 border border-border/30">
            <div className="flex items-center gap-2">
              <div className={cn("size-2 rounded-full", liveEnabled ? "bg-green-500 animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.6)]" : "bg-muted-foreground/30")} />
              <Label htmlFor="live-notifications" className="text-xs cursor-pointer font-medium select-none">Live Notifications</Label>
            </div>
            <Switch 
              id="live-notifications" 
              checked={liveEnabled} 
              onCheckedChange={handleLiveToggle} 
              className="scale-75 origin-right"
            />
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-[350px] sm:h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const Icon = ICON_MAP[notification.type] || Bell;
                const colorClass = COLOR_MAP[notification.type] || 'text-muted-foreground bg-muted';

                return (
                  <div
                    key={notification._id}
                    className={cn(
                      "group relative flex items-start gap-3 border-b border-border/40 p-3 transition-colors hover:bg-muted/50 sm:p-4",
                      !notification.isRead && "bg-muted/35"
                    )}
                  >
                    {!notification.isRead && (
                      <div className="absolute left-1 top-1/2 -translate-y-1/2">
                        <Circle className="size-1.5 fill-foreground text-foreground" />
                      </div>
                    )}
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", colorClass)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 pr-4">
                      <Link 
                        href={notification.link} 
                        className="text-sm font-semibold leading-tight text-foreground hover:underline"
                        onClick={() => {
                          markAsRead(notification._id);
                          setOpen(false);
                        }}
                      >
                        {notification.message}
                      </Link>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {!notification.isRead && (
                       <button 
                        onClick={() => markAsRead(notification._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        title="Mark as read"
                       >
                         <CheckCircle2 className="size-4" />
                       </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/40">
                <Bell className="size-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        <Separator />
        <Link 
          href="/admin/notifications" 
          className="flex h-10 items-center justify-center text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:h-11 sm:text-xs"
          onClick={() => setOpen(false)}
        >
          View All Notifications
          <ChevronRight className="ml-1 size-3" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

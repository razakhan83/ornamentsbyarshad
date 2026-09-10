'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Bell, ShoppingCart, MessageSquare, UserPlus, Circle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  order: ShoppingCart,
  review: MessageSquare,
  user: UserPlus,
};

const COLOR_MAP = {
  order: 'border-border bg-muted text-foreground',
  review: 'border-border bg-muted text-foreground',
  user: 'border-border bg-muted text-foreground',
};

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function NotificationsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/notifications', fetcher);

  const notifications = data?.success ? data.data : [];
  const loading = isLoading && !data;

  async function markAsRead(id) {
    try {
      mutate(
        { ...data, data: notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)) },
        false
      );
      
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      mutate();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  }

  async function markAllRead() {
    try {
      mutate(
        { ...data, data: notifications.map((n) => ({ ...n, isRead: true })) },
        false
      );
      
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      
      if (res.ok) {
        toast.success('All notifications marked as read');
      }
      
      mutate();
    } catch (error) {
       console.error('Failed to mark all as read', error);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all your store notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className={cn("inline-flex items-center justify-center rounded-md border border-border bg-background h-8 px-3 text-xs font-medium shadow-sm hover:bg-muted hover:text-foreground transition-colors")}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to Dashboard
          </Link>
          <Button variant="default" size="sm" onClick={markAllRead} disabled={notifications.every(n => n.isRead) || loading}>
            Mark All as Read
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col divide-y divide-border/40">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 sm:p-6">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/4 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col divide-y divide-border/40">
              {notifications.map((notification) => {
                const Icon = ICON_MAP[notification.type] || Bell;
                const colorClass = COLOR_MAP[notification.type] || 'text-muted-foreground bg-muted';

                return (
                  <div
                    key={notification._id}
                    className={cn(
                      "group relative flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 sm:p-6",
                      !notification.isRead && "bg-muted/20"
                    )}
                  >
                    {!notification.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2">
                        <Circle className="size-2 fill-primary text-primary" />
                      </div>
                    )}
                    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", colorClass)}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Link 
                        href={notification.link} 
                        className={cn("text-sm font-semibold leading-tight text-foreground hover:underline", !notification.isRead && "text-foreground")}
                        onClick={() => markAsRead(notification._id)}
                      >
                        {notification.message}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(notification.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {!notification.isRead && (
                       <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        title="Mark as read"
                       >
                         <CheckCircle2 className="size-5" />
                       </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center p-8">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/40">
                <Bell className="size-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">You&apos;re all caught up! New events will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

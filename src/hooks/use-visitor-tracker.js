'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import PusherClient from 'pusher-js';

const GEO_STORAGE_KEY = 'oba_visitor_geo';

export function useVisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Guardrail: Skip tracking on admin pages to keep metrics clean and prevent self-monitoring
    if (!pathname || pathname.startsWith('/admin')) {
      return;
    }

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) {
      return; // Silent fail if Pusher keys not configured
    }

    let client = null;
    let channel = null;
    let isCancelled = false;

    // Guardrail 2: Non-blocking deferred initialization (run when browser is idle)
    const runTracker = async () => {
      try {
        let geo = null;

        // 1. Check sessionStorage cache first to avoid repeated /api/geo calls
        try {
          const cached = sessionStorage.getItem(GEO_STORAGE_KEY);
          if (cached) {
            geo = JSON.parse(cached);
          }
        } catch {
          // sessionStorage restricted / quota error
        }

        if (!geo || !geo.lat || !geo.lng) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

          try {
            const res = await fetch('/api/geo', {
              signal: controller.signal,
              headers: { 'Cache-Control': 'no-cache' },
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              geo = await res.json();
              try {
                sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(geo));
              } catch {
                // Ignore storage failure
              }
            }
          } catch {
            clearTimeout(timeoutId);
          }
        }

        if (isCancelled) return;

        // Coordinates & metadata query string for presence auth
        const lat = geo?.lat ?? 24.9;
        const lng = geo?.lng ?? 67.0;
        const city = encodeURIComponent(geo?.city || 'Karachi');
        const country = encodeURIComponent(geo?.country || 'Pakistan');
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

        client = new PusherClient(pusherKey, {
          cluster,
          authEndpoint: `/api/pusher/auth?role=visitor&lat=${lat}&lng=${lng}&city=${city}&country=${country}`,
        });

        channel = client.subscribe('presence-active-visitors');
        globalThis.__oba_pusher_visitor_channel = channel;
      } catch {
        // Silent error guardrail
      }
    };

    // Prevent reconnecting or re-subscribing if client is already connected in this tab session
    if (globalThis.__oba_pusher_visitor_channel) {
      return;
    }

    // Defer tracker execution until main thread idle
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (!isCancelled) runTracker();
        }, { timeout: 3000 });
      } else {
        const timer = setTimeout(() => {
          if (!isCancelled) runTracker();
        }, 1200);
        return () => {
          clearTimeout(timer);
        };
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [pathname]);
}

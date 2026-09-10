const CACHE_NAME = 'china-unique-shell-v2';
const ASSETS_CACHE = 'china-unique-assets-v2';

// Install event: cache core shell immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== ASSETS_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event: Instant App Shell delivery
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip localhost/dev, non-GET, API requests, NextAuth, Admin routes, or Cloudinary uploads
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/auth')
  ) {
    return;
  }

  // Hashed webpack/turbopack assets only — never cache arbitrary .js (RSC/HMR/new deploys)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // Navigations: network-first so App Router streaming and new deploys stay correct
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedResponse = await cache.match(request);
          return cachedResponse || new Response('', { status: 408 });
        }
      })
    );
  }
});

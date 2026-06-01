// LifeOS Service Worker — Phase 2 (client-side notification, no VAPID)
// Cache strategy: shell-only. _next/ and /api/ always go to network.
// No clients.claim() — progressive enhancement, SW takes over on next navigation.

const CACHE = 'app-v1';
const SHELL = ['/', '/dashboard', '/habits', '/manifest.webmanifest'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)))
);

self.addEventListener('activate', e =>
  e.waitUntil(
    // Clean up old cache versions
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  // No clients.claim() — avoids first-install stale-chunk footgun on Next.js
);

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Always fetch from network: Next.js JS chunks and API routes
  if (url.includes('/_next/') || url.includes('/api/')) {
    return; // browser handles natively — never cache these
  }
  // Cache-first for shell pages
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Phase 3 (VAPID): push event will fire proactively from server
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'Time to check in', body: '' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

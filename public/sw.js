// Service worker: offline support for the Arban's viewer.
//
// - Page images (CDN or /api/image proxy): cache-first — scans never change,
//   so once a page has been viewed it works offline forever (capped LRU-ish).
// - Hashed Next.js static assets: cache-first (immutable by construction).
// - Navigations: network-first so deploys propagate immediately, with the
//   cached copy (or the last cached shell) served when offline.
// - Everything else (API calls, Supabase auth) goes straight to the network.

const VERSION = 'v1';
const PAGE_CACHE = `arbans-pages-${VERSION}`;
const SHELL_CACHE = `arbans-shell-${VERSION}`;
const STATIC_CACHE = `arbans-static-${VERSION}`;
const MAX_PAGE_ENTRIES = 500;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('arbans-') && !n.endsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) {
    await cache.delete(keys[i]); // insertion order: oldest first
  }
}

function isPageImage(request, url) {
  if (request.destination !== 'image') return false;
  return /\/page-\d+\.(webp|png|jpe?g)$/.test(url.pathname) || url.pathname.startsWith('/api/image/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isPageImage(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        // Opaque responses come from the no-cors CDN <img> requests
        if (response.ok || response.type === 'opaque') {
          await cache.put(request, response.clone());
          event.waitUntil(trimCache(PAGE_CACHE, MAX_PAGE_ENTRIES));
        }
        return response;
      })()
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match('/', { ignoreSearch: true })) ||
            Response.error()
          );
        }
      })()
    );
  }
});

const CACHE_NAME = 'sahyatri-offline-safety-v1';
const PRECACHE_ASSETS = [
  '/',
  '/safety',
  '/medical',
  '/favicon.ico',
];

// Install event: caching the critical safety/medical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching critical safety and medical pages');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: cleaning up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache version:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first, fallback-to-cache strategy for safety durability
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip dev endpoints, socket.io connections, or external non-http routes
  if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the request is successful (status 200), dynamically update/refresh the cache
        if (networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch((error) => {
        console.log(`[Service Worker] Network error. Serving cached safety asset for: ${event.request.url}`, error);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cache match exists, standard browser offline fallback will trigger
        });
      })
  );
});

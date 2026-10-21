const CACHE_NAME = 'nasobilka-app-v3';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    return cachedResponse ?? caches.match('/');
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  // Vite modules must always come from the running development server.
  if (url.origin !== self.location.origin ||
      url.pathname.startsWith('/src/') ||
      url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/node_modules/')) {
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request).catch(() => caches.match('/')));
});

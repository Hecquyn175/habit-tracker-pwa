/**
 * SYSTEM: NGŨ HÀNH LEVELING v4.0 ULTIMATE
 * Service Worker: sw.js — 100% Offline Precache & Cache-First Strategy
 */

const CACHE_VERSION = 'nhl-v4.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './css/styles.css',
  './css/tailwind.build.css',
  './js/engine.js',
  './js/state.js',
  './js/cron.js',
  './js/audio.js',
  './js/charts.js',
  './js/ui.js',
  './js/app.js',
  './vendor/chart.umd.min.js',
  './vendor/confetti.browser.min.js',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './fonts/be-vietnam-pro-vietnamese-400-normal.woff2',
  './fonts/be-vietnam-pro-vietnamese-500-normal.woff2',
  './fonts/be-vietnam-pro-vietnamese-600-normal.woff2',
  './fonts/be-vietnam-pro-vietnamese-700-normal.woff2',
  './fonts/be-vietnam-pro-latin-ext-400-normal.woff2',
  './fonts/be-vietnam-pro-latin-ext-500-normal.woff2',
  './fonts/be-vietnam-pro-latin-ext-600-normal.woff2',
  './fonts/be-vietnam-pro-latin-ext-700-normal.woff2',
  './fonts/be-vietnam-pro-latin-400-normal.woff2',
  './fonts/be-vietnam-pro-latin-500-normal.woff2',
  './fonts/be-vietnam-pro-latin-600-normal.woff2',
  './fonts/be-vietnam-pro-latin-700-normal.woff2',
  './fonts/chakra-petch-vietnamese-600-normal.woff2',
  './fonts/chakra-petch-vietnamese-700-normal.woff2',
  './fonts/chakra-petch-latin-ext-600-normal.woff2',
  './fonts/chakra-petch-latin-ext-700-normal.woff2',
  './fonts/chakra-petch-latin-600-normal.woff2',
  './fonts/chakra-petch-latin-700-normal.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_VERSION) {
            return caches.delete(k);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Fallback index.html cho điều hướng trang (navigation requests)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        return (
          cached ||
          fetch(event.request).catch(() => caches.match('./index.html'))
        );
      })
    );
    return;
  }

  // Chiến lược Cache-First cho tài nguyên tĩnh
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

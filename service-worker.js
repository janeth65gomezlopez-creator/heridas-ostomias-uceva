/* =========================================================================
   service-worker.js — Caché inteligente y modo offline
   -------------------------------------------------------------------------
   Estrategia:
   - App shell (HTML/CSS/JS/manifest/iconos): cache-first, con actualización
     en segundo plano (stale-while-revalidate) para detectar nuevas versiones.
   - Resto de peticiones (imágenes, enlaces externos, PDFs): network-first
     con respaldo a caché si no hay conexión.
   Al publicar cambios, sube CACHE_VERSION para forzar la actualización.
   ========================================================================= */

const CACHE_VERSION = 'heridas-ostomias-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/responsive.css',
  './js/data.js',
  './js/app.js',
  './js/teacher.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isAppShell = url.origin === self.location.origin;

  if (isAppShell) {
    // Cache-first + revalidación en segundo plano (app shell, cronograma, recursos abiertos)
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            caches.open(CACHE_VERSION).then(cache => cache.put(req, networkResp.clone()));
          }
          return networkResp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    // Network-first para recursos externos (videos, artículos, bibliografía)
    event.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          caches.open(CACHE_VERSION).then(cache => cache.put(req, resp.clone()));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

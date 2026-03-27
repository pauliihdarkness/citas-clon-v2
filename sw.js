// Service Worker Minimalista — Limpieza
// Propósito: Limpiar el SW anterior y evitar errores de caché

const CACHE_VERSION = 'v1-cleanup-v2';

// Install: Limpiar caches antiguos
self.addEventListener('install', (event) => {
  console.log('[SW] Install event - limpiando caches');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Eliminando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate: Tomar control inmediatamente
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(clients.claim());
});

// Fetch: Solo servir si está en cache, sino pasar a red (sin manejo de errores que cause problemas)
self.addEventListener('fetch', (event) => {
  // Solo manejar GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log('[SW] Sirviendo desde caché:', event.request.url);
        return response;
      }
      return fetch(event.request);
    }).catch(() => {
      // Si todo falla, solo dejar que falle silenciosamente
      return fetch(event.request);
    })
  );
});

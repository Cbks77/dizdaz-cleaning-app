// DizDaz Invoice — Service Worker
// Caches the full app for offline use

const CACHE = 'dizdaz-invoice-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install — cache everything upfront
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache local assets (must succeed)
      return cache.addAll(['/', '/index.html', '/icon.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png'])
        .then(() => {
          // Cache external assets (best effort — don't fail install if CDN is slow)
          return Promise.allSettled(
            PRECACHE.filter(u => u.startsWith('http')).map(u =>
              fetch(u, { mode: 'cors' }).then(r => cache.put(u, r)).catch(() => {})
            )
          );
        });
    }).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for local assets, network-first for external
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network-first for Google APIs (auth, drive)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('accounts.google.com') || url.hostname.includes('generativelanguage')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

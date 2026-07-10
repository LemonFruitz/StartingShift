const CACHE_NAME = 'starting-shift-v15';
const ASSETS = [
  '/', '/index.html', '/shift.html', '/bd-report.html',
  '/admin.html', '/supervisor.html', '/pjo.html', '/tv.html',
  '/style.css', '/p2h-data.js', '/offline-sync.js',
  '/logo-hte.png', '/icon-192.png', '/icon-512.png', '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  // CDN — network first
  if (e.request.url.includes('cdn.jsdelivr.net') || e.request.url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Static — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); }
        return res;
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') return caches.match('/index.html');
    })
  );
});

// OpsHub Service Worker — handles push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'OpsHub';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open OpsHub' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [100, 50, 100],
    requireInteraction: data.data?.type === 'overdue'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

// Cache app shell for offline capability
const CACHE_NAME = 'opshub-v1';
const CACHE_URLS = ['/', '/static/js/bundle.js', '/static/css/main.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) return; // Never cache API calls
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Service Worker for M&M Artsy Web Push & Background Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background Web Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'M&M Artsy',
    body: 'Your order has been updated!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/track' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data,
      };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.data?.tag || 'order-status-update',
    renotify: true,
    data: data.data || { url: '/track' },
    actions: [
      {
        action: 'view-order',
        title: 'View Order 📦',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click: Focus or open the customer's tracking page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/track';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/track') && 'focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message event from webpage to trigger notification via service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_ORDER_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    const options = {
      body: body || 'Update sa iyong order',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: tag || 'order-status-update',
      renotify: true,
      data: { url: url || '/track' },
      actions: [
        {
          action: 'view-order',
          title: 'View Order 📦',
        },
      ],
    };
    self.registration.showNotification(title || '🌸 M&M Artsy Shop', options);
  }
});

// Custom service worker code — injected into sw.js by next-pwa

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'Новое уведомление',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.data?.type || 'default',
      renotify: true,
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Kelsa', options),
    );
  } catch (e) {
    console.error('[SW] Push parse error:', e);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'CHAT_MESSAGE' && data.orderNumber) {
    url = '/account?order=' + data.orderNumber + '&chat=1';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

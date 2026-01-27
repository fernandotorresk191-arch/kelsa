// Service Worker для курьерского приложения с поддержкой Push уведомлений

// Событие push-уведомления
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Новое уведомление',
      icon: data.icon || '/cur192.png',
      badge: data.badge || '/cur192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.data?.type || 'default',
      renotify: true,
      requireInteraction: true,
      data: data.data || {},
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Kelsa Курьер', options)
    );
  } catch (e) {
    console.error('Push parse error:', e);
  }
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытое окно — фокусируемся на нём
      for (const client of clientList) {
        if (client.url.includes('/courier') && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое
      if (self.clients.openWindow) {
        return self.clients.openWindow('/courier');
      }
    })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

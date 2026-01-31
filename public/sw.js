// Service Worker para notificações push - JARVIS
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Você tem um lembrete',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/jarvis/reminders',
      reminderId: data.reminderId,
    },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
    tag: data.reminderId || 'jarvis-reminder',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS Lembrete', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/jarvis/reminders')
    );
  }
});

// Evento de instalação
self.addEventListener('install', function(event) {
  console.log('JARVIS Service Worker instalado');
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', function(event) {
  console.log('JARVIS Service Worker ativado');
  event.waitUntil(clients.claim());
});

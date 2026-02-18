// GUTA Service Worker - Push Notifications
// Versão: 2.0

const SW_VERSION = "2.0.0";

// Evento de instalação
self.addEventListener("install", (event) => {
  console.log(`[SW v${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener("activate", (event) => {
  console.log(`[SW v${SW_VERSION}] Activated`);
  event.waitUntil(clients.claim());
});

// Evento de push - recebe notificação do servidor
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  let data = {
    title: "GUTA Lembrete",
    body: "Você tem um lembrete",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: "/jarvis/reminders",
    },
  };

  // Parse payload if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: {
          url: payload.data?.url || payload.data?.route || data.data.url,
          reminder_id: payload.data?.reminder_id,
        },
      };
    } catch (e) {
      // If not JSON, use text as body
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    tag: data.data?.reminder_id || "guta-reminder-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: "view", title: "Ver" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento de clique na notificação
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event);
  
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "/jarvis/reminders";

  if (action === "dismiss") {
    // User dismissed, just close
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes("/jarvis") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // No window open, create new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Evento de fechamento da notificação (dismiss)
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event);
});

// Push subscription change (quando subscription muda)
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed");
  // Could re-subscribe here if needed
});

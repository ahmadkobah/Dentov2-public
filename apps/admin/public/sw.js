/**
 * Service Worker — Push Notifications
 *
 * Per IMPLEMENTATION_ROADMAP Week 13 Task 4 — VAPID Keys + Service Worker + Push API
 * Per DENTO_V2_MASTER_PLAN.md §20 — Web Push Notifications
 *
 * Handles:
 * - Push event → display notification
 * - Notification click → open the relevant page
 * - Background sync for offline queued actions
 */

/* global self, clients */

// ── Push Event Handler ─────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Dento Notification',
      body: event.data.text(),
      icon: '/favicon.svg',
    };
  }

  const title = payload.title || 'Dento';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || `dento-${Date.now()}`,
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: payload.priority === 'high',
    silent: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click Handler ─────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Route to relevant page based on notification type
  if (data.appointmentId) {
    targetUrl = `/appointments/${data.appointmentId}`;
  } else if (data.patientId) {
    targetUrl = `/patients/${data.patientId}`;
  } else if (data.invoiceId) {
    targetUrl = `/invoices/${data.invoiceId}`;
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

// ── Notification Close Handler (analytics) ─────────────────

self.addEventListener('notificationclose', (_event) => {
  // Could be used to track dismissed notifications via analytics endpoint
});

// ── Install + Activate ─────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* eslint-disable no-restricted-globals */
/**
 * AirNest Service Worker Push & AQI Threshold Notification Module
 * Imported into the Vite PWA Service Worker via workbox.importScripts.
 * Triggers browser notifications via the Notification API when local AQI exceeds
 * 'Unhealthy' levels (default > 150) or when a Web Push alert arrives.
 */

const DEFAULT_UNHEALTHY_THRESHOLD = 151;
const NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000;
let lastNotifiedKey = '';
let lastNotifiedAt = 0;

function formatAqiAlertBody(data) {
  const city = data.city || 'your area';
  const aqi = Number(data.aqi) || 0;
  const band = data.band || 'Unhealthy';
  const pm25 = data.pm25 ? ` (PM2.5: ${Math.round(Number(data.pm25))} µg/m³)` : '';
  const windowHint = data.bestWindow ? ` Cleanest window: ${data.bestWindow}.` : '';
  const zeroCostStep =
    aqi > 300
      ? 'Keep windows sealed, stay indoors, and wear a fitted N95 outdoors.'
      : 'Close street-facing windows (₹0) and shift outdoor workouts to cleaner hours.';
  return `AQI in ${city} reached ${aqi} (${band})${pm25}. ${zeroCostStep}${windowHint}`;
}

async function showAqiNotification(payload, force = false) {
  if (typeof self.registration === 'undefined' || !self.registration.showNotification) {
    return;
  }
  const threshold = Number(payload.threshold) || DEFAULT_UNHEALTHY_THRESHOLD;
  const aqi = Number(payload.aqi) || 0;
  if (!force && aqi < threshold) {
    return;
  }

  const dedupeKey = `${payload.city || 'city'}-${Math.floor(aqi / 25)}`;
  const now = Date.now();
  if (!force && dedupeKey === lastNotifiedKey && now - lastNotifiedAt < NOTIFICATION_COOLDOWN_MS) {
    return;
  }
  lastNotifiedKey = dedupeKey;
  lastNotifiedAt = now;

  const title =
    payload.title ||
    (aqi > 300
      ? `AirNest Severe Smog Alert: ${payload.city || 'Local'} AQI ${aqi}`
      : `AirNest Unhealthy Air Alert: ${payload.city || 'Local'} AQI ${aqi}`);

  const body = payload.body || formatAqiAlertBody(payload);

  await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'airnest-aqi-threshold-alert',
    renotify: true,
    requireInteraction: aqi > 300,
    vibrate: aqi > 300 ? [200, 100, 200] : [140, 80, 140],
    data: {
      url: '/?view=dashboard&route=plan',
      route: 'plan',
      city: payload.city || '',
      aqi,
    },
    actions: [
      { action: 'view-plan', title: 'View Daily Plan' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

// 1. Standard Web Push API event listener
self.addEventListener('push', (event) => {
  let payload = {
    title: 'AirNest Air Quality Alert',
    body: 'Local air quality has exceeded Unhealthy levels. Open AirNest for your ₹0 protection plan.',
    aqi: DEFAULT_UNHEALTHY_THRESHOLD,
    threshold: DEFAULT_UNHEALTHY_THRESHOLD,
  };
  try {
    if (event.data) {
      payload = Object.assign(payload, event.data.json());
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(showAqiNotification(payload, true));
});

// 2. Client-to-SW message channel for live local AQI threshold checks & test alerts
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'CHECK_AQI_THRESHOLD' && msg.payload) {
    event.waitUntil(showAqiNotification(msg.payload, false));
  } else if (msg.type === 'TEST_AQI_ALERT' && msg.payload) {
    event.waitUntil(showAqiNotification(msg.payload, true));
  }
});

// 3. Focus or open AirNest directly onto the Daily Plan when the alert is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetRoute = (event.notification.data && event.notification.data.route) || 'plan';
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'AIRNEST_OPEN_ROUTE', route: targetRoute });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

/**
 * Client bridge for AirNest Service Worker AQI Threshold Push Notifications.
 * Dispatches AQI threshold checks to the Vite PWA Service Worker so alerts fire
 * via the Notification API whenever local AQI exceeds 'Unhealthy' levels (default > 150).
 */

import type { AqiSnapshot } from '../../packages/shared/schemas';

export const DEFAULT_UNHEALTHY_THRESHOLD = 151;
const THRESHOLD_STORAGE_KEY = 'airnest_aqi_alert_threshold_v1';

export type AqiNotificationPermission = NotificationPermission | 'unsupported';

export function isUnhealthyAqi(aqi: number, threshold = DEFAULT_UNHEALTHY_THRESHOLD): boolean {
  return Number.isFinite(aqi) && aqi >= threshold;
}

export function getStoredAqiThreshold(): number {
  try {
    const raw = window.localStorage.getItem(THRESHOLD_STORAGE_KEY);
    const parsed = raw ? Number(raw) : DEFAULT_UNHEALTHY_THRESHOLD;
    return Number.isFinite(parsed) && parsed >= 100 && parsed <= 450
      ? parsed
      : DEFAULT_UNHEALTHY_THRESHOLD;
  } catch {
    return DEFAULT_UNHEALTHY_THRESHOLD;
  }
}

export function saveStoredAqiThreshold(threshold: number): void {
  try {
    window.localStorage.setItem(THRESHOLD_STORAGE_KEY, String(threshold));
  } catch {
    // Ignore storage restriction
  }
}

export function getNotificationPermissionState(): AqiNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestAqiNotificationPermission(): Promise<AqiNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export interface AqiAlertDispatchResult {
  triggered: boolean;
  channel: 'service-worker' | 'window-notification' | 'in-app-only' | 'below-threshold';
  message: string;
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1500)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Evaluates local AQI against the configured 'Unhealthy' threshold and triggers
 * the browser Notification API inside the Vite PWA Service Worker.
 */
export async function evaluateAndTriggerAqiAlert(
  snapshot: AqiSnapshot,
  threshold = DEFAULT_UNHEALTHY_THRESHOLD,
  force = false
): Promise<AqiAlertDispatchResult> {
  if (!force && !isUnhealthyAqi(snapshot.aqi, threshold)) {
    return {
      triggered: false,
      channel: 'below-threshold',
      message: `${snapshot.city} AQI ${snapshot.aqi} is below your alert threshold (${threshold}).`,
    };
  }

  const summaryMessage = `Unhealthy Air Alert: ${snapshot.city} AQI is ${snapshot.aqi} (${snapshot.band}, PM2.5 ${snapshot.pm25} µg/m³). Keep windows sealed (₹0) and check your Daily Plan.`;
  const permission = getNotificationPermissionState();

  if (permission !== 'granted') {
    return {
      triggered: true,
      channel: 'in-app-only',
      message: summaryMessage,
    };
  }

  const payload = {
    city: snapshot.city,
    aqi: snapshot.aqi,
    pm25: snapshot.pm25,
    band: snapshot.band,
    bestWindow: snapshot.bestWindow,
    threshold,
  };

  const reg = await getReadyServiceWorkerRegistration();
  if (reg?.active) {
    reg.active.postMessage({
      type: force ? 'TEST_AQI_ALERT' : 'CHECK_AQI_THRESHOLD',
      payload,
    });
    return {
      triggered: true,
      channel: 'service-worker',
      message: summaryMessage,
    };
  }

  if (reg && 'showNotification' in reg) {
    await reg.showNotification(`AirNest Alert: ${snapshot.city} AQI ${snapshot.aqi}`, {
      body: summaryMessage,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'airnest-aqi-threshold-alert',
    });
    return {
      triggered: true,
      channel: 'service-worker',
      message: summaryMessage,
    };
  }

  try {
    new Notification(`AirNest Alert: ${snapshot.city} AQI ${snapshot.aqi}`, {
      body: summaryMessage,
      icon: '/pwa-192x192.png',
      tag: 'airnest-aqi-threshold-alert',
    });
    return {
      triggered: true,
      channel: 'window-notification',
      message: summaryMessage,
    };
  } catch {
    return {
      triggered: true,
      channel: 'in-app-only',
      message: summaryMessage,
    };
  }
}

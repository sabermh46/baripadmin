/// <reference lib="webworker" />
/* eslint-env serviceworker */
/* global clients */

/**
 * The application's ONE service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 * History worth keeping, because two different bugs came out of the same root cause —
 * the dev and production service workers not being the same file:
 *
 *  1. Originally a hand-written `public/sw.js` held the push handlers while
 *     vite-plugin-pwa ran in `generateSW` mode. generateSW emits its worker to
 *     `dist/sw.js` — the exact same path — so the build silently overwrote it and
 *     production shipped a worker with no `push` listener at all. Push worked in dev
 *     (where public/ is served verbatim) and was dead in every deployment.
 *
 *  2. Moving the handlers to `public/push-sw.js` + `workbox.importScripts` fixed
 *     production, but vite-plugin-pwa's *dev* worker is a minimal stub that ignores
 *     `workbox.importScripts`. Worse, in dev `/sw.js` isn't a script at all — the dev
 *     server returns the index.html fallback for it, so the app's manual
 *     `navigator.serviceWorker.register('/sw.js')` failed with an "unsupported MIME
 *     type (text/html)" error. Push was then broken in dev instead.
 *
 * `injectManifest` builds *this* file for both dev and production, so there is exactly
 * one worker and no divergence to keep in sync. Everything the app needs — precaching,
 * SPA navigation fallback, font caching and push — lives here.
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// Take over immediately rather than waiting for every tab to close. Paired with
// registerType: 'autoUpdate', this is what makes a deploy apply on the next load.
self.skipWaiting();
clientsClaim();

// __WB_MANIFEST is replaced at build time with the precache manifest.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA fallback: any navigation that isn't a real file serves index.html so client-side
// routing works offline. The denylist keeps API/auth/file routes going to the network —
// serving index.html for those would hand HTML to code expecting JSON.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/, /^\/auth/, /^\/uploads/, /^\/storage/, /^\/push/],
  })
);

// Google Fonts (loaded via an @import in index.css). Immutable once fetched, so
// CacheFirst with a long expiry. `statuses: [0, 200]` because font CDN responses are
// opaque cross-origin.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Deliberately NOT caching /api responses here. RTK Query already persists them to
// IndexedDB, scoped to the logged-in user and purged on logout; a second copy in the
// service worker's HTTP cache would outlive logout and could serve one user's data to
// the next person on a shared device.

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Backend always sends JSON, but a malformed/empty push must still show something
    // rather than throwing — an unhandled push event can cost us the subscription.
    payload = {};
  }

  const title = payload.title || 'Bari Porichalona';
  const options = {
    body: payload.body || 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    // Collapses repeats: a second notification with the same tag replaces the first
    // instead of stacking, which matters when several events fire close together.
    tag: payload.data?.tag || 'barip-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((windowClients) => {
        // Tells any open tab to refetch its notification list. App.jsx listens for this.
        for (const client of windowClients) {
          client.postMessage({ type: 'NEW_NOTIFICATION', timestamp: Date.now() });
        }
      })
      .catch(() => {
        // Never let a failed notification reject the push event.
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data?.url || '/notification';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an already-open tab and route it, rather than opening a duplicate window.
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: target });
          return client.focus();
        }
      }

      return self.clients.openWindow(target);
    })
  );
});

// Lets the page trigger activation of a waiting worker (kept for the update flow).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

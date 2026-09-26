import { lazy } from 'react';

/**
 * React.lazy that survives the two ordinary ways a page's code fails to arrive.
 *
 * 1. A deploy happened while the app was open. The installed PWA stays open for days. On a
 *    deploy the new service worker takes over at once (skipWaiting + clientsClaim in
 *    sw.js) and drops the previous build's chunks from its cache, and the server no longer
 *    has those file names either. The next menu tap in the old tab asks for a chunk that
 *    exists nowhere. Reloading fetches the new index.html, which names the new chunks.
 *    That is what happens here, once: a sessionStorage stamp stops it becoming a loop when
 *    the failure is something a reload cannot fix.
 *
 * 2. A bad moment on a mobile connection. One quiet retry covers the blip before anything
 *    is shown.
 *
 * Anything else, being offline in particular, is thrown so the route error boundary
 * (RouteErrorBoundary) can say so inside the layout. It used to reach no boundary at all,
 * which is what unmounted the whole app and left a white screen.
 */

const RELOAD_STAMP = 'bp-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 30_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isChunkLoadError = (error) => {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically|Unable to preload CSS|MIME type/i.test(text);
};

const recentlyReloaded = () => {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOAD_STAMP) || 0) < RELOAD_COOLDOWN_MS;
  } catch {
    // No storage: assume we did, so this can never loop.
    return true;
  }
};

const reloadOnce = () => {
  try {
    sessionStorage.setItem(RELOAD_STAMP, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
};

export const lazyWithRetry = (importer) =>
  lazy(async () => {
    try {
      return await importer();
    } catch (firstError) {
      if (navigator.onLine !== false) {
        await sleep(600);
        try {
          return await importer();
        } catch {
          // fall through with the first error
        }
      }

      // Online and still failing: almost always a stale build. Reload into the new one,
      // and keep Suspense's loader up in the meantime instead of flashing an error.
      if (navigator.onLine !== false && isChunkLoadError(firstError) && !recentlyReloaded() && reloadOnce()) {
        return new Promise(() => {});
      }

      throw firstError;
    }
  });

export default lazyWithRetry;

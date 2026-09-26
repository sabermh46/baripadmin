import { baseApi } from './api/baseApi';
import { clearOfflineApiCache } from './offlineApiCache';

/**
 * The lifecycle around store/offlineApiCache.js.
 *
 * 1. Privacy. The saved copies are one person's houses, renters and payments. They are
 *    wiped on logout, and when a DIFFERENT user signs in (the same rule store/index.js
 *    applies to the RTK cache, and for the same reason: closing the tab is not logging
 *    out). A silent token refresh re-dispatches setCredentials for the same user and
 *    must not wipe anything, so this compares ids rather than reacting to the action alone.
 *
 * 2. Freshness. A screen answered from the saved copy looks fulfilled to RTK, with a fresh
 *    timestamp. Left alone, reconnecting would refetch only what is mounted
 *    (refetchOnReconnect), and a saved answer for anything else would count as current for
 *    another two minutes (refetchOnMountOrArgChange: 120). So when the connection returns,
 *    every entry that was served from the saved copy is refetched: mounted or not, but only
 *    those, never the whole cache.
 */
const RECONNECT_SETTLE_MS = 800;

export const offlineCacheMiddleware = (storeApi) => (next) => (action) => {
  if (action.type === 'auth/logout') {
    clearOfflineApiCache();
    const result = next(action);
    storeApi.dispatch({ type: 'ui/clearOfflineStale' });
    return result;
  }

  if (action.type === 'auth/setCredentials') {
    const incoming = action.payload?.user?.id;
    const current = storeApi.getState()?.auth?.user?.id;
    if (incoming != null && current != null && incoming !== current) {
      clearOfflineApiCache();
      storeApi.dispatch({ type: 'ui/clearOfflineStale' });
    }
  }

  const result = next(action);

  if (action.type === 'ui/setOnlineStatus' && action.payload === true) {
    // A beat for the connection to settle: the `online` event fires as soon as an
    // interface comes up, often before DNS or the route to the API is usable.
    setTimeout(() => {
      const state = storeApi.getState();
      const stale = Object.keys(state?.ui?.offlineStale ?? {});

      for (const queryCacheKey of stale) {
        const entry = state?.[baseApi.reducerPath]?.queries?.[queryCacheKey];
        const endpoint = entry && baseApi.endpoints[entry.endpointName];

        if (!endpoint?.initiate) {
          // Evicted from the RTK cache since: nothing on screen to refresh.
          storeApi.dispatch({ type: 'ui/markFresh', payload: queryCacheKey });
          continue;
        }

        // subscribe:false, so this adds no subscription that could keep the entry alive.
        // baseApi clears the stale mark when the live answer arrives.
        storeApi.dispatch(endpoint.initiate(entry.originalArgs, { subscribe: false, forceRefetch: true }));
      }
    }, RECONNECT_SETTLE_MS);
  }

  return result;
};

export default offlineCacheMiddleware;

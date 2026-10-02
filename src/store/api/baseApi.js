import { createApi } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';
import axios from 'axios';
import { requestKey, readResponse, saveResponse, currentGeneration } from '../offlineApiCache';

// Store is injected after creation to avoid circular imports.
let store;
export const injectStore = (_store) => { store = _store; };

// Singleton refresh promise — prevents multiple simultaneous 401s from each
// firing their own POST /auth/refresh. All queued requests share one refresh.
let refreshPromise = null;

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // sends HttpOnly refresh-token cookie automatically
});

// Request interceptor — read access token from Redux memory only (never localStorage)
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store?.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let browser set Content-Type + boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['Accept'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Endpoints whose whole job is to judge credentials, so a 401 from them is the answer, not
 * a sign that the session lapsed.
 *
 * Without this list, signing in with the wrong password did the following: POST /auth/login
 * returned 401, the interceptor read that as an expired access token and fired
 * POST /auth/refresh, that refresh had no cookie to work with and returned 401 too — and the
 * login form ended up displaying "Invalid or expired refresh token" instead of "Invalid email
 * or password", after a full page reload. The user had never been logged in at all.
 *
 * It never looped: `_retry` caps each request at one retry, and the /auth/refresh branch
 * returns before it can refresh a refresh. It was one wasted round trip and one wrong
 * sentence, every time somebody mistyped a password.
 */
const AUTHENTICATING_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/validate-token',
  '/auth/change-password',
  '/auth/set-password',
];

const isAuthenticatingRequest = (url = '') =>
  AUTHENTICATING_ENDPOINTS.some((path) => url.includes(path));

// Response interceptor — use HttpOnly cookie for silent token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A failing /auth/refresh used to unconditionally log out and hard-redirect to /login.
    // That fires for network errors too (axios rejects with no `response` when the request
    // never completed), so a dropped connection or a restarting API threw the user out of
    // a perfectly valid session. Only a definitive 401/403 — the server actually saying the
    // refresh token is dead — should end it; anything else is left for AuthInitializer to
    // retry with backoff.
    if (originalRequest?.url?.includes('/auth/refresh')) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        store?.dispatch({ type: 'auth/logout' });

        // Only leave if there is somewhere to go. Replacing /login with /login is a full
        // reload that throws away React state — including the error message just written
        // into the form the user is looking at.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.replace('/login');
        }
      }
      return Promise.reject(error);
    }

    // A 401 from anything above means "those details are wrong", and refreshing cannot help.
    if (isAuthenticatingRequest(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Reuse an in-flight refresh rather than firing a second one.
      if (!refreshPromise) {
        refreshPromise = axios({
          method: 'POST',
          url: `${import.meta.env.VITE_APP_API_URL}/auth/refresh`,
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        })
          .then(({ data }) => {
            store?.dispatch({ type: 'auth/setCredentials', payload: {
              user: data.user ?? store.getState().auth.user,
              accessToken: data.accessToken,
              // Was omitted, so expiresAt fell back to a 1h guess and the proactive
              // renewal fired far earlier than the token actually needed.
              expiresIn: data.expiresIn,
            }});
            return data.accessToken;
          })
          .catch((err) => {
            // Same rule as above: only a definitive rejection ends the session. A network
            // error here means we could not ask, not that the answer was no.
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
              store?.dispatch({ type: 'auth/logout' });
            }

            return Promise.reject(err);
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Only flag it as an auth error when the refresh was actually rejected. Tagging a
        // network failure `isAuthError` made axiosBaseQuery below dispatch a logout for it.
        const status = refreshError?.response?.status;
        const isAuthError = status === 401 || status === 403;

        return Promise.reject(Object.assign(new Error('Request failed'), refreshError, { isAuthError }));
      }
    }

    return Promise.reject(error);
  }
);


/**
 * An id that arrives undefined does not fail loudly on its own — it interpolates straight
 * into the path and the request goes out as `/houses/undefined/expenses`, which the backend
 * rejects as an unknown route. The resulting toast blames routing, when the real fault is at
 * the call site: usually a key spelled `house_id` where the endpoint destructures `houseId`.
 *
 * Development only. In production the request proceeds exactly as before, so this can never
 * turn a degraded page into a broken one for a user.
 */
const warnOnMissingPathParam = (args) => {
  const url = typeof args === 'string' ? args : args?.url;
  if (typeof url !== 'string') return;

  const bad = url.match(/\/(undefined|null)(\/|$|\?)/);
  if (!bad) return;

  console.error(
    `[api] "${bad[1]}" in request path: ${url}`,
    'An id was undefined when the request was built — check that the call site passes the '
    + 'exact key the endpoint destructures (a snake_case/camelCase mismatch is the usual cause).',
  );
};

/**
 * Which requests get an offline copy (see store/offlineApiCache.js).
 *
 * Queries only (`api.type`), so a GET-method mutation such as the Google sign-in redeem,
 * which returns tokens, is never stored. Plain JSON GETs only: no uploads, and no binary
 * downloads (PDFs, exports), which set a responseType. The auth and push paths are
 * excluded outright; nothing under them is page data.
 */
const OFFLINE_DENYLIST = /\/auth\/(login|logout|refresh|google|register)|\/push\//;

const isOfflineCacheable = (args, api) => {
  if (api?.type !== 'query') return false;
  const url = typeof args === 'string' ? args : args?.url;
  if (typeof url !== 'string' || OFFLINE_DENYLIST.test(url)) return false;
  if (typeof args === 'object') {
    if (args.method && args.method.toUpperCase() !== 'GET') return false;
    if (args.body instanceof FormData || args.responseType) return false;
  }
  return true;
};

/**
 * "The network could not answer", as opposed to "the server said no". No response at all
 * (offline, DNS, timeout, connection reset), or a gateway saying the app server is
 * unreachable. A real answer, including a 500, is never papered over with a saved copy.
 */
const isNetworkFailure = (err) => !err?.response || [502, 503, 504].includes(err.response.status);

const axiosBaseQuery = () => async (args, api) => {
  if (import.meta.env.DEV) warnOnMissingPathParam(args);

  const cacheable = isOfflineCacheable(args, api);
  const userId = cacheable ? api.getState()?.auth?.user?.id : undefined;
  const key = cacheable ? requestKey(args) : null;
  const startedGeneration = currentGeneration();

  // The saved copy, returned exactly as a live answer would be, so every screen renders it
  // with no changes of its own. It is marked in the ui slice so the layout can say the
  // screen is showing saved data, and so reconnecting refetches it (offlineCacheMiddleware).
  const serveSaved = async () => {
    const saved = await readResponse(userId, key);
    if (!saved) return null;
    if (api.queryCacheKey) {
      api.dispatch({ type: 'ui/markServedOffline', payload: { queryCacheKey: api.queryCacheKey, at: saved.at } });
    }
    return { data: saved.data, meta: { fromOfflineCache: true, savedAt: saved.at } };
  };

  // Known offline: do not wait on a request that cannot succeed.
  if (cacheable && typeof navigator !== 'undefined' && navigator.onLine === false) {
    const hit = await serveSaved();
    if (hit) return hit;
    // A string payload is what apiErrorMessage reads as "no connection".
    return { error: { status: 'OFFLINE', data: 'offline' } };
  }

  try {
    // If body is FormData, we need to handle it specially
    if (args.body instanceof FormData) {
      const config = {
        url: args.url,
        method: args.method || 'GET',
        data: args.body,
        // Don't set headers here - axiosInstance will handle it
      };
      
      const result = await axiosInstance(config);
      return { data: result.data };
    }
    
    // Normal request handling
    const result = await axiosInstance(args);

    if (cacheable) {
      saveResponse(userId, key, result.data, startedGeneration);
      // This screen had been showing a saved copy; it is live again.
      if (api.queryCacheKey && api.getState()?.ui?.offlineStale?.[api.queryCacheKey]) {
        api.dispatch({ type: 'ui/markFresh', payload: api.queryCacheKey });
      }
    }

    return { data: result.data };
  } catch (err) {
    // The network failed (rather than the server refusing): answer with the last saved copy
    // if there is one, instead of an error that blanks the screen.
    if (cacheable && isNetworkFailure(err)) {
      const hit = await serveSaved();
      if (hit) return hit;
    }

    // Log out only when the session is genuinely finished:
    //   - isAuthError: the refresh itself was rejected 401/403 (now only set in that case,
    //     so a request that never reached the server no longer triggers a logout), or
    //   - a 401 that persisted after the interceptor already retried with a fresh token.
    // A plain first-time 401 is NOT included: the interceptor refreshes and replays it, and
    // treating it as fatal here would log the user out mid-recovery.
    const retriedAndStillUnauthorised = err.response?.status === 401 && err.config?._retry;

    if (err.isAuthError || retriedAndStillUnauthorised) {
      api.dispatch({ type: 'auth/logout' });
    }

    // 402 is the subscription gate. Without this the code came back to whichever component
    // happened to make the call, which showed it as an ordinary failure — so a lapsed owner
    // saw "Subscription expired" toasted over a dashboard of zeroes, once per widget, and
    // nothing telling them what to do about it.
    if (err.response?.status === 402 && err.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
      api.dispatch({ type: 'ui/setSubscriptionBlocked', payload: true });
    }

    // A 403 means the server disagrees with what this client thinks it may do — which is
    // precisely when the cached permission list is worth re-reading. See permissionSync.js.
    // Fire-and-forget: the original error is still returned to the caller unchanged.
    if (err.response?.status === 403) {
      // Imported lazily rather than at the top of the file: permissionSync.js imports
      // axiosInstance from here, so a static import is a cycle — and the build's
      // chunk-cycle guard rejects those. It also means a bug in the sync path cannot
      // break module evaluation for the whole API layer.
      //
      // This call had no import at all, so every 403 threw "handleForbidden is not
      // defined" from inside the baseQuery — turning an ordinary permission denial into
      // an unhandled error, which is what put the console in the state it was in.
      const url = typeof args === 'string' ? args : args?.url;
      import('../permissionSync.js')
        .then(({ handleForbidden }) => handleForbidden(api.dispatch, api.getState, url, err.response?.data))
        .catch(() => { /* resyncing permissions is best-effort; never mask the original 403 */ });
    }

    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    };
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  /**
   * EVERY tag type used anywhere in the app must be listed here.
   *
   * RTK Query silently drops a providesTags/invalidatesTags entry whose type is not
   * declared — it warns once in development and then ignores it. Seventeen types were in
   * use across the API slices and none of them were declared: Notification, Renter,
   * Payment, AdvancePayment, PaymentReceipt, Caretaker, CaretakerAssignment, Houses,
   * HouseFlats, HouseStats, HouseCaretakers, Analytics, HouseOwnerAnalytics, Report,
   * SystemSettings, EmailStats, WorkerStats.
   *
   * So across 56 call sites, no mutation ever invalidated anything. Marking a notification
   * read, creating a renter, recording a payment, assigning a caretaker — none of them
   * refreshed the lists they changed. That is why so many components call refetch() by
   * hand: the manual refetches were compensating for invalidation that never fired, and
   * they are the reason a single action could cost several requests.
   *
   * Adding the missing types is what makes cache invalidation work at all, and is the
   * precondition for removing those manual refetches.
   */
  tagTypes: [
    'Auth', 'User', 'Settings', 'SystemSettings', 'AuditLog', 'LandingPage',
    'House', 'Houses', 'HouseFlats', 'HouseStats', 'HouseCaretakers',
    'Flat', 'Renter', 'Notice',
    'Payment', 'AdvancePayment', 'PaymentReceipt', 'Loan',
    'Caretaker', 'CaretakerAssignment',
    'AppFeePayments', 'AppFeeBreakdown',
    'ManagedOwners', 'ManagedUsers',
    'Notification', 'UserApproval', 'NotificationSettings', 'SmsProvider',
    'Analytics', 'HouseOwnerAnalytics', 'Report', 'EmailStats', 'WorkerStats',
    'EmailTemplate', 'SmsAllowance', 'SmsSettings', 'SmsLog',
    'DeveloperPanel', 'PushEvent', 'SupportChannel',
  ],

  // Restores the query cache that redux-persist wrote to IndexedDB, so a reload paints
  // from cache instead of waiting on the network. This is RTK Query's own rehydration
  // hook — it takes only the parts of the slice that are safe to restore and rebuilds
  // subscriptions itself, which hand-merging the persisted state would get wrong.
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === REHYDRATE) {
      return action.payload?.[reducerPath];
    }
  },

  // Keep entries for 10 minutes after the last component unsubscribes, so navigating
  // away and back re-renders from cache instead of refetching (default is 60s).
  keepUnusedDataFor: 600,

  // Stale-while-revalidate: render the cached result immediately, and only re-request in
  // the background if it is older than 2 minutes. `true` would refetch on every mount,
  // which defeats the cache; `false` would never refresh a warm entry.
  refetchOnMountOrArgChange: 120,
  refetchOnReconnect: true,

  endpoints: () => ({}),
});
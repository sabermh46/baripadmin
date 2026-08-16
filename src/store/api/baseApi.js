import { createApi } from '@reduxjs/toolkit/query/react';
import { REHYDRATE } from 'redux-persist';
import axios from 'axios';

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
        window.location.replace('/login');
      }
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


const axiosBaseQuery = () => async (args, api) => {
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
    return { data: result.data };
  } catch (err) {
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
  tagTypes: ['Auth', 'User', 'House', 'Flat', 'Notice', 'AppFeePayments', 'AppFeeBreakdown', 'ManagedOwners', 'ManagedUsers', 'Loan', 'LandingPage', 'Settings', 'AuditLog'],

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
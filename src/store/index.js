import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import indexedDBStorage from './storage/indexedDBStorage';
import { notificationApi } from './api/notificationApi';

const storage = indexedDBStorage;

/**
 * `accessToken` and `expiresAt` are persisted deliberately (see authSlice.js for the full
 * reasoning). Keeping the token out of storage forced a mandatory /auth/refresh round trip
 * on every single page load, so one flaky request logged the user out — and it did not
 * actually stop XSS, because script in this origin can call /auth/refresh and have the
 * browser attach the HttpOnly cookie for it anyway.
 *
 * `isLoading` stays blacklisted so it always resets to true on boot; `error` because a
 * stale error message should not survive a reload.
 */
const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['isLoading', 'error'],
};

/**
 * Persist the RTK Query cache so a reload paints from IndexedDB instead of the network.
 *
 * Only `queries` is kept. `mutations` are one-shot and meaningless once restored;
 * `subscriptions`/`provided` describe which components are currently mounted, which is
 * false the moment the page reloads — RTK Query rebuilds both itself via the
 * extractRehydrationInfo hook in baseApi.
 *
 * In-flight queries are dropped too: a request that was still pending when the tab closed
 * would otherwise rehydrate as permanently 'pending' and its component would hang on a
 * spinner that never resolves.
 */
const apiCacheTransform = createTransform(
  (inbound) => ({
    queries: Object.fromEntries(
      Object.entries(inbound?.queries ?? {}).filter(([, e]) => e?.status === 'fulfilled')
    ),
  }),
  (outbound) => ({ ...outbound, mutations: {}, provided: {}, subscriptions: {} }),
  { whitelist: ['api'] }
);

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['ui', 'api'],
  transforms: [apiCacheTransform],
  // Coalesce writes: without this every cache update rewrites the whole slice to
  // IndexedDB, which on a data-heavy page is a lot of serialisation on the main thread.
  throttle: 1000,
};

const combinedReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: uiReducer,
  [authApi.reducerPath]: authApi.reducer,
  [notificationApi.reducerPath]: notificationApi.reducer,
});

/**
 * Drop the whole RTK Query cache on logout.
 *
 * Mandatory now that the cache is persisted to IndexedDB: without this, everything the
 * previous user loaded (their houses, renters, payments) would survive logout on a shared
 * browser and be served straight from disk to whoever logs in next, before any request
 * goes out. Clearing the slice makes the next session start cold.
 */
const dropApiCache = (state, action) =>
  combinedReducer({ ...state, [baseApi.reducerPath]: undefined }, action);

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    return dropApiCache(state, action);
  }

  /**
   * A DIFFERENT person just signed in on this browser.
   *
   * Purging on logout alone left a hole: logout is the tidy path, and it is not the
   * only one. Close the tab without signing out, or end the session any way that
   * does not dispatch `auth/logout`, and the next person to log in inherits the
   * previous user's cached houses, renters and payments — served straight out of
   * IndexedDB before any request goes to the server.
   *
   * Keyed on the user id changing rather than on setCredentials alone, because that
   * same action fires on every silent token refresh (AuthInitializer, and the 401
   * retry in baseApi). Purging there would discard the whole cache roughly once an
   * hour for no reason.
   */
  if (action.type === 'auth/setCredentials') {
    const incoming = action.payload?.user?.id;
    const current = state?.auth?.user?.id;

    if (incoming != null && incoming !== current) {
      return dropApiCache(state, action);
    }
  }

  return combinedReducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(authApi.middleware)
});

/**
 * Without this, RTK Query's refetchOnFocus and refetchOnReconnect never fire — the flags are
 * read, but nothing is listening for the browser events that trigger them. baseApi has set
 * `refetchOnReconnect: true` all along and it has never once worked: coming back from a
 * dropped connection left every screen showing whatever it had before the drop.
 */
setupListeners(store.dispatch);

export const persistor = persistStore(store);

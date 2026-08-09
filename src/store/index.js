import { configureStore, combineReducers } from '@reduxjs/toolkit';
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
const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    return combinedReducer({ ...state, [baseApi.reducerPath]: undefined }, action);
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

export const persistor = persistStore(store);

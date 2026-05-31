import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { authApi } from './api/authApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import indexedDBStorage from './storage/indexedDBStorage';
import { notificationApi } from './api/notificationApi';

const storage = indexedDBStorage;

// Persist auth slice but never write the access token to storage —
// it lives only in Redux memory and is re-acquired via refresh on page load.
const authPersistConfig = {
  key: 'auth',
  storage,
  blacklist: ['accessToken', 'isLoading', 'error'],
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['ui'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: uiReducer,
  [authApi.reducerPath]: authApi.reducer,
  [notificationApi.reducerPath]: notificationApi.reducer,
});

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

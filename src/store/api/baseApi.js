import { createApi } from '@reduxjs/toolkit/query/react';
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

    if (originalRequest.url.includes("/auth/refresh")) {
      store?.dispatch({ type: 'auth/logout' });
      window.location.replace("/login");
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
              user: store.getState().auth.user,
              accessToken: data.accessToken,
            }});
            return data.accessToken;
          })
          .catch((err) => {
            store?.dispatch({ type: 'auth/logout' });
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
        return Promise.reject({ ...refreshError, isAuthError: true });
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
    if (err.isAuthError || err.response?.status === 401) {
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
  tagTypes: ['Auth', 'User', 'House', 'Flat', 'Notice', 'AppFeePayments', 'ManagedOwners', 'ManagedUsers', 'Loan', 'LandingPage', 'Settings'],
  endpoints: () => ({}),
});
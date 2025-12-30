import { createApi } from '@reduxjs/toolkit/query/react';
import axios, { AxiosError } from 'axios';
// import { RootState } from '..'; // Import removed

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For session cookies
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Automatically handle FormData - remove Content-Type for FormData
    if (config.data instanceof FormData) {
      // Remove the Content-Type header so browser sets it with boundary
      delete config.headers['Content-Type'];
      
      // Also ensure we don't have any other JSON-specific headers
      delete config.headers['Accept'];
      
      // If you need to set any specific headers for FormData, do it here
      // For example, you might want to set a boundary or other headers
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ❌ DO NOT retry refresh endpoint itself
    if (originalRequest.url.includes("/auth/refresh")) {
      // Clear tokens and redirect to login
      localStorage.clear();
      window.location.replace("/login");
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        // ✅ Use plain axios WITHOUT interceptor for refresh call
        const { data } = await axios({
          method: 'POST',
          url: `${import.meta.env.VITE_APP_API_URL}/auth/refresh`,
          data: { refreshToken: refreshToken },
          headers: {
            'Content-Type': 'application/json'
          }
          // NO Authorization header, NO withCredentials
        });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
  localStorage.clear();
  return Promise.reject({
    ...refreshError,
    isAuthError: true
  });
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
  tagTypes: ['Auth', 'User', 'House', 'Flat', 'Notice'],
  endpoints: () => ({}),
});
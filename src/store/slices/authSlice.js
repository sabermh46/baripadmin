import { createSlice } from '@reduxjs/toolkit';


const initialState = {
  user: null,
  // accessToken lives only in Redux memory — never written to any JS-accessible storage.
  // The refreshToken is stored as an HttpOnly cookie by the server.
  accessToken: null,
  isAuthenticated: false,
  // Starts true so ProtectedRoute shows a spinner until AuthInitializer completes
  // the silent refresh check. It's blacklisted from persistence so it always
  // resets to true on page load, blocking API calls until the token is restored.
  isLoading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },

    setUser: (state, action) => {
      state.user = action.payload;
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { 
  setCredentials, 
  logout, 
  setUser, 
  setLoading, 
  setError 
} = authSlice.actions;

export default authSlice.reducer;
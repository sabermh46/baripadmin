import { createSlice } from '@reduxjs/toolkit';

/**
 * The access token IS persisted now (see authPersistConfig in store/index.js).
 *
 * It used to be kept in Redux memory only and re-acquired via the HttpOnly refresh cookie
 * on every page load. That is the textbook shape, but here it bought nothing and cost a lot:
 *
 *  - It made a round trip to /auth/refresh MANDATORY before the app could render anything
 *    after any reload. Any hiccup on that single request — API restarting, laptop waking
 *    from sleep, flaky connection, rate limit — logged the user straight out.
 *  - It did not actually defend against XSS. /auth/refresh is callable from page
 *    JavaScript and the browser attaches the HttpOnly cookie automatically, so script
 *    running in this origin can mint a fresh access token whenever it likes. HttpOnly
 *    protects the *long-lived* credential from being carried away; it never stopped the
 *    short-lived one from being obtained.
 *
 * So the token is stored alongside `user` (already persisted), with `expiresAt` so the app
 * can tell a valid token from a stale one without asking the server. The refresh token
 * stays HttpOnly — that is the part genuinely worth protecting, since it is replayable for
 * 30 days.
 */
const initialState = {
  user: null,
  accessToken: null,
  // Epoch ms. Lets AuthInitializer choose between "boot instantly" and "refresh first"
  // without a network call, and lets the app refresh proactively instead of waiting for a 401.
  expiresAt: null,
  isAuthenticated: false,
  // Blacklisted from persistence so it always resets on load; ProtectedRoute shows a
  // spinner while true.
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
      // The API returns `expiresIn` in seconds. Falling back to 1h means a caller that
      // omits it degrades to "refresh sooner", never to "never refresh".
      state.expiresAt = Date.now() + (Number(action.payload.expiresIn) || 3600) * 1000;
      state.isAuthenticated = true;
      state.error = null;
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.expiresAt = null;
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
  setError,
} = authSlice.actions;

export default authSlice.reducer;

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { setCredentials, logout, setLoading } from '../../store/slices/authSlice';

// Runs once on app startup. If a user session is persisted but the access token
// is missing (page reload), it attempts a silent refresh via the HttpOnly
// refresh-token cookie. While pending, isLoading stays true so ProtectedRoute
// shows a spinner instead of firing API calls with no token.
export function AuthInitializer() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const accessToken = useSelector((state) => state.auth.accessToken);

  useEffect(() => {
    // No persisted session — nothing to restore.
    if (!user) {
      dispatch(setLoading(false));
      return;
    }

    // Token already present (e.g. set by a previous effect run in dev StrictMode).
    if (accessToken) {
      dispatch(setLoading(false));
      return;
    }

    // User exists but token is gone (page reload) — try silent refresh.
    axios
      .post(
        `${import.meta.env.VITE_APP_API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        dispatch(
          setCredentials({
            user: data.user ?? user,
            accessToken: data.accessToken,
          })
        );
      })
      .catch(() => {
        // Refresh cookie expired or invalid — force logout.
        dispatch(logout());
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
    // `user`/`accessToken` deliberately included: the `auth` slice rehydrates from
    // IndexedDB independently of (and sometimes slower than, since it's a nested
    // persistReducer under a root persistor that only whitelists `ui`) the PersistGate
    // this component mounts under. An empty dep array would run this exactly once,
    // possibly before `user` has been restored yet, permanently skip the refresh, and
    // leave the session logged out until the next real navigation — an intermittent
    // failure that looked like "refresh token sometimes fails on browser reload." The
    // two early-return guards above make re-runs safe: once a token exists this becomes
    // a no-op, so it can't loop or double-fire.
  }, [user, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

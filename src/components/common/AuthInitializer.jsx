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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

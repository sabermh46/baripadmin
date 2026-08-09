import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { setCredentials, logout, setLoading } from '../../store/slices/authSlice';

// Renew this long before the token actually expires, so a request is never sent with a
// token that dies in flight.
const REFRESH_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Keeps the session alive without making the user sign in again unnecessarily.
 *
 * Three separate causes of "I keep getting logged out", all addressed here:
 *
 *  1. Booting no longer requires the network. The access token is persisted now, so when
 *     the stored one is still valid the app starts immediately with zero requests.
 *     Previously every reload had to call /auth/refresh before rendering anything.
 *
 *  2. Only a definitive rejection ends the session. The old code was
 *     `.catch(() => dispatch(logout()))`, which treats "your session is invalid" and "the
 *     wifi blinked" identically — so an API restart, a sleeping laptop or one dropped
 *     request signed the user out. Now only 401/403 from the refresh endpoint (the server
 *     actually saying the refresh token is dead) logs out; network errors, timeouts, 5xx
 *     and 429 keep the session and retry with exponential backoff.
 *
 *  3. Renewal is proactive — on a timer and on tab focus — instead of waiting for some
 *     unlucky request to fail with a 401 first.
 *
 * The previous module-scoped `refreshAttempted` flag is gone. It capped the app at one
 * refresh per page load, which combined with (2) meant a single transient failure was
 * unrecoverable without a manual reload. Concurrency is handled properly now by collapsing
 * callers onto one in-flight promise.
 */
export function AuthInitializer() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const accessToken = useSelector((state) => state.auth.accessToken);
  const expiresAt = useSelector((state) => state.auth.expiresAt);

  // Refs, not state: these coordinate async work without causing re-renders.
  const inFlightRef = useRef(null);
  const retryTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!user) {
      dispatch(setLoading(false));
      return undefined;
    }

    let cancelled = false;

    const clearTimers = () => {
      clearTimeout(retryTimerRef.current);
      clearTimeout(refreshTimerRef.current);
    };

    const doRefresh = () => {
      // Collapse concurrent callers (mount + focus + timer) onto a single request.
      if (inFlightRef.current) return inFlightRef.current;

      inFlightRef.current = axios
        .post(`${import.meta.env.VITE_APP_API_URL}/auth/refresh`, {}, { withCredentials: true })
        .then(({ data }) => {
          if (cancelled) return;
          attemptRef.current = 0;
          dispatch(
            setCredentials({
              user: data.user ?? user,
              accessToken: data.accessToken,
              expiresIn: data.expiresIn,
            })
          );
        })
        .catch((err) => {
          if (cancelled) return;

          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            clearTimers();
            dispatch(logout());
            return;
          }

          attemptRef.current += 1;
          const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF_MS);
          retryTimerRef.current = setTimeout(doRefresh, delay);
        })
        .finally(() => {
          inFlightRef.current = null;
          if (!cancelled) dispatch(setLoading(false));
        });

      return inFlightRef.current;
    };

    const msLeft = expiresAt ? expiresAt - Date.now() : -1;

    if (accessToken && msLeft > REFRESH_SKEW_MS) {
      // Stored token is still good: render immediately, no network call, and schedule the
      // renewal for just before it lapses.
      dispatch(setLoading(false));
      refreshTimerRef.current = setTimeout(doRefresh, msLeft - REFRESH_SKEW_MS);
    } else {
      // Missing, expired, or about to expire.
      doRefresh();
    }

    // A tab left open for days may have had its timers throttled, or the machine may have
    // been suspended, so re-check whenever it becomes visible again.
    const onFocus = () => {
      if (document.hidden) return;
      const left = expiresAt ? expiresAt - Date.now() : -1;
      if (left <= REFRESH_SKEW_MS) doRefresh();
    };

    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearTimers();
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
    // `expiresAt` is a dependency so a successful refresh reschedules the next renewal.
  }, [user, accessToken, expiresAt, dispatch]);

  return null;
}

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAuth } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { useGoogleLoginMutation } from '../../store/api/authApi';
import { reportGoogleResultAndClose } from '../../utils/googleAuth';

/**
 * Where the API sends the browser after Google.
 *
 * Two ways to arrive:
 *   - `?popup=1`: inside the sign-in popup (utils/googleAuth.js). Report to the tab that
 *     opened it and close. That tab redeems the session, so this window never touches it.
 *   - no flag: a full-page redirect (popup blocked, or an installed PWA). Redeem here.
 *
 * Every exit is a `replace`, so this entry never stays in history. It used to `navigate()`
 * (push), which left /auth/success one Back away from the dashboard. The API's side of the
 * bridge is single-use now, so landing here a second time can only fail. Before, it silently
 * signed the last Google user back in, even after they had logged out.
 */
const AuthSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const [googleLogin] = useGoogleLoginMutation();
  const [message, setMessage] = useState('Authenticating...');
  // The bridge redeems once, so the request must go out once. StrictMode runs effects
  // twice in development, and the second run would get a 403 and bounce a user who had
  // just signed in successfully back to /login.
  const started = useRef(false);

  const isPopup = params.get('popup') === '1';
  const error = params.get('error');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (isPopup) {
      reportGoogleResultAndClose(error);
      // Browsers refuse window.close() for a tab that script did not open. Carry on as a
      // normal page in that case rather than sitting on a spinner.
      // No cleanup on purpose: StrictMode's simulated unmount would clear it, and the
      // guarded second run never sets it again.
      setTimeout(() => {
        if (window.closed) return;
        if (error) {
          navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
        } else {
          setMessage('Signed in. You can close this window.');
        }
      }, 600);
      return undefined;
    }

    // Back from the dashboard onto this entry: nothing to redeem, just move on.
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return undefined;
    }

    googleLogin()
      .unwrap()
      .then((data) => {
        dispatch(setCredentials(data));
        navigate('/dashboard', { replace: true });
      })
      .catch(() => navigate('/login?error=google_auth_failed', { replace: true }));

    return undefined;
    // Runs once per landing by design (see `started`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default AuthSuccess;

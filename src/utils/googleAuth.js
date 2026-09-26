/**
 * Google sign-in without leaving Google's pages in this tab's history.
 *
 * THE PROBLEM
 * -----------
 * The flow used to be a full-page redirect: /login → API → accounts.google.com → API
 * callback → /auth/success → /dashboard. Every step was a history entry, and after signing
 * in, Back walked through them into Google's account chooser. Google's pages belong to
 * another origin, so once they are in this tab's history no script can remove them.
 *
 * THE FIX
 * -------
 * Run Google in a popup. This tab never navigates, so its history is exactly what it was
 * before the button was pressed. The popup finishes on /auth/success?popup=1 (the API
 * remembers popup mode in its session, see GoogleAuthController), announces the result,
 * and closes. This tab then redeems the one-time session bridge itself and replaces the
 * login entry with the dashboard.
 *
 * The result comes back over BroadcastChannel, with a localStorage event as the fallback,
 * never through window.opener. Google's pages set Cross-Origin-Opener-Policy, which cuts the
 * popup off from its opener partway through the flow, so window.opener is null by the time
 * the popup is back on our origin. For the same reason `popup.closed` cannot be trusted to
 * tell us the user gave up (Chrome reports a severed popup as closed), so there is no
 * polling on it. A popup the user abandons simply never reports, and the button works again.
 *
 * FALLBACK
 * --------
 * A full-page redirect when a popup cannot work: blocked by the browser, or an installed
 * PWA (iOS standalone mode opens popups in a separate browser with separate storage, so the
 * result could never reach this tab). Those users still get the history fixes on our side:
 * /auth/success replaces itself and /login redirects signed-in users away.
 */

const CHANNEL = 'bp-google-auth';
// One attempt at a time. A popup the user closes never reports, so its promise never
// settles; pressing the button again reopens the popup and shares that same promise, which
// means a result is only ever handled once however many times the button was pressed.
let pending = null;
const STORAGE_KEY = 'bp-google-auth-result';

const isStandalonePwa = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const googleAuthUrl = ({ token, popup = false } = {}) => {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (popup) params.set('popup', '1');
  const qs = params.toString();
  return `${import.meta.env.VITE_APP_API_URL}/auth/google${qs ? `?${qs}` : ''}`;
};

/**
 * Starts Google sign-in. Resolves `{ error: null }` when the popup reports success,
 * `{ error: code }` when it reports a failure, or `{ redirected: true }` when it fell back
 * to a full-page redirect (the promise then never matters: this page is going away).
 */
export const startGoogleSignIn = ({ token } = {}) => {
  if (isStandalonePwa()) {
    window.location.assign(googleAuthUrl({ token }));
    return Promise.resolve({ redirected: true });
  }

  const width = 500;
  const height = 650;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  const popup = window.open(
    googleAuthUrl({ token, popup: true }),
    'bp-google-auth',
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );

  if (!popup) {
    window.location.assign(googleAuthUrl({ token }));
    return Promise.resolve({ redirected: true });
  }

  popup.focus?.();
  if (pending) return pending;

  pending = new Promise((resolve) => {
    let channel = null;
    // Each handler needs the other (finish removes the storage listener), so they share a
    // holder instead of referring to one another before both exist.
    const on = {};

    on.finish = (message) => {
      if (!message || message.type !== 'google-auth-result') return;
      channel?.close();
      window.removeEventListener('storage', on.storage);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // storage unavailable: nothing to clean up
      }
      pending = null;
      resolve({ error: message.error ?? null });
    };

    on.storage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        on.finish(JSON.parse(event.newValue));
      } catch {
        // not ours
      }
    };

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => on.finish(event.data);
    }
    window.addEventListener('storage', on.storage);
  });

  return pending;
};

/**
 * Called by /auth/success inside the popup. Closing is asynchronous and the browser may
 * refuse it (a tab not opened by script), so the caller checks `window.closed` a moment
 * later and carries on as a normal page if it is still open.
 */
export const reportGoogleResultAndClose = (error) => {
  const message = { type: 'google-auth-result', error: error || null, at: Date.now() };

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // no BroadcastChannel: the storage event below carries it
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
  } catch {
    // storage blocked: BroadcastChannel above is the only path
  }

  window.close();
};

/** User-facing text for the error codes the API puts on /login?error=… or the popup result. */
export const GOOGLE_ERROR_MESSAGES = {
  registration_disabled: 'New registrations are currently closed. Please contact an administrator to get access.',
  google_auth_failed: 'Google sign-in failed. Please try again or use email and password.',
  google_email_unverified: 'Your Google account email is not verified, so it cannot be used to sign in here.',
  account_exists_password:
    'An account with this email already exists. Sign in with your password, then link Google from your profile. Forgot the password? Reset it first.',
};

/**
 * A post-login destination is only ever a path inside this app. `from` comes from router
 * state, but checking it keeps a crafted value from turning login into an open redirect.
 */
export const safeInternalPath = (path, fallback = '/dashboard') =>
  typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login')
    ? path
    : fallback;

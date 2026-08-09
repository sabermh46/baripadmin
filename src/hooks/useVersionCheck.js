import { useEffect } from 'react';
import { toast } from 'react-toastify';

const CLIENT_VERSION = __APP_VERSION__;
const CHECK_INTERVAL_MS = 12 * 60 * 1000;
const SESSION_KEY = 'barip_version_notified';
// localStorage (not sessionStorage) so the throttle survives a reload and new tabs —
// otherwise every refresh and every extra tab fires its own immediate check.
const LAST_CHECK_KEY = 'barip_version_last_check';

const readLastCheck = () => {
  try {
    return Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
  } catch {
    return 0; // storage disabled (private mode / blocked cookies) — treat as never checked
  }
};

const writeLastCheck = (ts) => {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(ts));
  } catch {
    // ignore — losing the throttle is better than breaking the app
  }
};

export function useVersionCheck() {
  useEffect(() => {
    const apiBase = import.meta.env.VITE_APP_API_URL;
    if (!apiBase) return;

    const check = async () => {
      try {
        const res = await fetch(`${apiBase}/api/version`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version: serverVersion } = await res.json();

        // Only stamp on a successful response, so a failed/offline attempt retries at the
        // next tick instead of being throttled out for a further 12 minutes.
        writeLastCheck(Date.now());

        if (serverVersion && serverVersion !== CLIENT_VERSION) {
          if (!sessionStorage.getItem(SESSION_KEY)) {
            sessionStorage.setItem(SESSION_KEY, '1');
            toast.info(
              'A new version is available. Click here to refresh.',
              {
                autoClose: false,
                closeOnClick: true,
                draggable: false,
                onClick: () => window.location.reload(),
              }
            );
          }
        }
      } catch (_) {
        // network error — silently ignore
      }
    };

    // Skip the mount check if one already happened inside the window. Schedule the first
    // timer for whatever is left of it, so the cadence stays 12 min across reloads rather
    // than restarting on every page load.
    const elapsed = Date.now() - readLastCheck();
    const remaining = Math.max(0, CHECK_INTERVAL_MS - elapsed);

    let intervalId;
    if (remaining === 0) check();

    const timeoutId = setTimeout(() => {
      check();
      intervalId = setInterval(check, CHECK_INTERVAL_MS);
    }, remaining || CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
}

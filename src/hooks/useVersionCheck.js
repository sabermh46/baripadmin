import { useEffect } from 'react';
import { toast } from 'react-toastify';

const CLIENT_VERSION = __APP_VERSION__;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_KEY = 'barip_version_notified';

export function useVersionCheck() {
  useEffect(() => {
    const apiBase = import.meta.env.VITE_APP_API_URL;
    if (!apiBase) return;

    const check = async () => {
      try {
        const res = await fetch(`${apiBase}/api/version`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version: serverVersion } = await res.json();
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

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}

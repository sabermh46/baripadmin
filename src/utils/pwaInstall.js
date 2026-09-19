/**
 * Everything the app knows about being installed, in one place.
 *
 * Two reasons this is a module and not a slice or a component effect:
 *
 * 1. `beforeinstallprompt` fires early — regularly before React has mounted. App.jsx used
 *    to subscribe in a `useEffect`, so whenever the event won that race it was lost and no
 *    install offer appeared for the rest of the session. Registering at module load (main.jsx
 *    imports the app, which imports this) closes that window.
 * 2. The event object is not serialisable, so it cannot be put in Redux. A boolean copy of
 *    "an install is available" was kept in the ui slice instead — and that slice is persisted,
 *    so the flag came back `true` on the next cold load with no event behind it: a banner
 *    whose Install button did nothing. Subscribers here read the live value.
 */

let deferredPrompt = null;
const listeners = new Set();

const emit = () => listeners.forEach((notify) => notify());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome shows its own mini-infobar unless the event is preventDefault()ed; we want the
    // offer to appear where the rest of the UI is instead.
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  // The captured event is single-use and already spent once the install completes.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export const subscribe = (notify) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export const canPrompt = () => deferredPrompt !== null;

/**
 * Show the browser's install dialog. Resolves to 'accepted' | 'dismissed', or null when
 * there was no prompt to show.
 */
export const promptInstall = async () => {
  const event = deferredPrompt;
  if (!event) return null;

  // Cleared before awaiting: a prompt can only be shown once, and a second click while the
  // dialog is open would otherwise throw.
  deferredPrompt = null;
  emit();

  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
};

/**
 * iOS has no install prompt of any kind — Safari only offers Add to Home Screen by hand, and
 * every third-party browser on the platform is Safari underneath, so this is a device check
 * rather than a browser one. iPadOS 13+ reports itself as a Mac, hence the touch-point test.
 */
export const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

/** Already launched from the home screen — `navigator.standalone` is the iOS spelling. */
export const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
};

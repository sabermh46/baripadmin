import { useCallback, useState, useSyncExternalStore } from 'react';
import { canPrompt, isIosDevice, isStandalone, promptInstall, subscribe } from '../utils/pwaInstall';

/**
 * One install offer for both platforms.
 *
 * Android/desktop Chrome hands us a `beforeinstallprompt` event we can replay on a click;
 * iOS hands us nothing at all, so there the offer is a walkthrough of Safari's own
 * Add to Home Screen flow. Callers get the same `install()` either way and render
 * <IosInstallGuide> for the iOS branch.
 */
const usePwaInstall = () => {
  const promptAvailable = useSyncExternalStore(subscribe, canPrompt, () => false);
  const [guideOpen, setGuideOpen] = useState(false);

  // iOS is iOS for the life of the tab. Whether the app is installed is read once too, but
  // can be raised below: accepting the prompt installs it without reloading, and this tab
  // still has to stop offering.
  const [ios] = useState(isIosDevice);
  const [installed, setInstalled] = useState(isStandalone);

  const install = useCallback(async () => {
    if (ios) {
      setGuideOpen(true);
      return 'guide';
    }

    const outcome = await promptInstall();
    if (outcome === 'accepted') setInstalled(true);
    return outcome;
  }, [ios]);

  return {
    /** Worth showing an install affordance at all. */
    canInstall: !installed && (promptAvailable || ios),
    isIos: ios,
    isInstalled: installed,
    install,
    guideOpen,
    closeGuide: useCallback(() => setGuideOpen(false), []),
  };
};

export default usePwaInstall;

import { useEffect, useState } from 'react';
import { useAppSelector } from './index';
import { readOffline, writeOffline } from '../utils/offlineCache';

/**
 * Show the last data we successfully received, rather than a blank page, when the network
 * cannot produce anything new.
 *
 * Two triggers, both of which must be able to fire on their own:
 *
 *   offline    — navigator says there is no connection. Waiting is pointless; fall back at
 *                once. (uiSlice already tracks this from the online/offline events; nothing
 *                consumed it until now.)
 *   timed out  — a request that is neither succeeding nor failing. A dropped connection or a
 *                captive portal leaves a fetch hanging with no error to react to, and the
 *                browser's own timeout can be a minute or more. After `graceMs` of no data,
 *                stop waiting and show what we have.
 *
 * Fresh data always wins. This only ever fills a gap; it never overrides a live answer.
 *
 * @param {string} key           stable per screen+arguments — it is the storage key
 * @param {object} result        the RTK Query result ({ data, isLoading, isFetching, error })
 * @param {object} [options]
 * @param {number} [options.graceMs=5000]
 * @param {boolean} [options.enabled=true]  pass false to opt a screen out entirely
 */
/**
 * The whole decision, as a pure function — no hooks, no storage, no React.
 *
 * Split out because this is the part that has to be RIGHT, and the part worth testing: the
 * hook around it only gathers the five inputs. See scripts/../offlineDecision tests.
 *
 * @param {object}  i
 * @param {unknown} i.data      live data from the query, or undefined
 * @param {unknown} i.error     the query's error, if it failed
 * @param {object}  i.saved     { data, at } read from storage, or null
 * @param {boolean} i.isOnline
 * @param {boolean} i.timedOut  graceMs elapsed with a request still outstanding
 * @param {boolean} i.enabled
 */
export const decideOfflineState = ({ data, error, saved, isOnline, timedOut, enabled = true }) => {
  if (!enabled) {
    return { data, isStale: false, isOffline: false, savedAt: null, showSkeleton: data === undefined && !error, error };
  }

  // A live answer wins over everything else, including being offline — if RTK handed us data,
  // it is the freshest thing that exists.
  if (data !== undefined) {
    return { data, isStale: false, isOffline: !isOnline, savedAt: saved?.at ?? null, showSkeleton: false, error: undefined };
  }

  // Three independent reasons to stop waiting: there is no connection, the request has been
  // outstanding past the grace period, or it has already failed.
  const shouldFallBack = !isOnline || timedOut || !!error;

  if (shouldFallBack && saved) {
    return { data: saved.data, isStale: true, isOffline: !isOnline, savedAt: saved.at, showSkeleton: false, error: undefined };
  }

  return {
    data: undefined,
    isStale: false,
    isOffline: !isOnline,
    savedAt: null,
    // Keep the skeleton up only while an answer is still plausible: we are online, nothing
    // has failed, and the grace period has not run out.
    //
    // `isOnline &&` matters and was missing. Offline with nothing saved, none of the other
    // conditions are met either — no error, no timeout — so the skeleton stayed up forever
    // on a screen that had no prospect of data. Being offline is itself the answer; say so
    // immediately rather than animating at someone who cannot be helped by waiting.
    showSkeleton: isOnline && !error && !timedOut,
    error,
  };
};

export const useOfflineFallback = (key, result, { graceMs = 5000, enabled = true } = {}) => {
  const { data, isFetching, error } = result ?? {};
  const isOnline = useAppSelector((s) => s.ui?.isOnline ?? true);

  // Read once per key, not on every render: this touches localStorage and parses JSON, and
  // the value cannot change underneath us except through our own write below.
  //
  // React's "adjusting state when a prop changes" pattern, with the previous key held in
  // state rather than a ref — refs may not be read during render, and doing this in an effect
  // would paint one frame carrying the PREVIOUS key's data, which is the one thing this hook
  // exists to prevent.
  const [saved, setSaved] = useState(() => (enabled ? readOffline(key) : null));
  const [loadedForKey, setLoadedForKey] = useState(key);

  const [timedOut, setTimedOut] = useState(false);

  if (enabled && loadedForKey !== key) {
    setLoadedForKey(key);
    setSaved(readOffline(key));
    // A different screen is being asked about; the previous one's verdict does not apply.
    setTimedOut(false);
  }

  // Write-through only — deliberately no setState here.
  //
  // `saved` is read once per key at mount, and that is sufficient: the fallback is consulted
  // only when `data` is undefined, and RTK does not drop a cache entry's data mid-mount. The
  // case that matters is a REMOUNT while offline (which `keepUnusedDataFor: 0` on the live
  // endpoints makes common), and that re-runs the initializer against a localStorage entry
  // this effect has already updated. Mirroring the value into state as well would buy
  // nothing and would be a setState in an effect body.
  useEffect(() => {
    if (!enabled || data === undefined) return;
    writeOffline(key, data);
  }, [enabled, key, data]);

  // The grace timer. Runs only while a request is genuinely outstanding and there is nothing
  // to show; anything else clears it, so the flag can never be left set from a previous fetch.
  useEffect(() => {
    if (!enabled || data !== undefined || !isFetching) return undefined;

    // setState in the timer callback, not in the effect body — the body only schedules.
    const id = setTimeout(() => setTimedOut(true), graceMs);
    return () => clearTimeout(id);
  }, [enabled, data, isFetching, graceMs, key]);

  return decideOfflineState({ data, error, saved, isOnline, timedOut, enabled });
};

export default useOfflineFallback;

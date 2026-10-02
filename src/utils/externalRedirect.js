/**
 * Leaving the app for another site (Google) and coming back, without leaving that site's
 * pages one Back press away.
 *
 * THE PROBLEM
 * -----------
 * A full-page trip to Google adds history entries: Google's account chooser, maybe a
 * password or 2-step page, then our callback. Google's entries belong to another origin, so
 * no script can delete or rewrite them. After signing in, Back walked straight into them.
 * The popup flow (utils/googleAuth.js) avoids the trip entirely, but it cannot run
 * everywhere: an installed app, or a browser that blocks the popup, still redirects.
 *
 * THE FIX
 * -------
 * Script cannot remove entries, but it can travel over them. Before leaving, record how
 * long this tab's history is. On return, the difference is exactly how many entries the trip
 * added (Google's plus our callback), and `history.go(-n)` jumps back over all of them to the
 * entry we left from. That page then replaces itself with the real destination. The result:
 * the entries before the trip, then the destination, and Back goes where it should.
 *
 * WHERE THE HAND-OFF LIVES, AND WHY IT IS SPLIT
 * ---------------------------------------------
 * The trip record (id + history length) is in sessionStorage, so it belongs to this tab.
 * The landing note ("open X when you land") is in localStorage, keyed by the trip id.
 * It cannot be in sessionStorage: a cross-site trip makes Chrome move the returning page to
 * a new browsing context group (Google's pages send Cross-Origin-Opener-Policy, which forces
 * it). The returning page gets a COPY of sessionStorage, and the page we jump back to still
 * has the original. A note written by the returning page into its copy never reached the
 * page that had to act on it. That was observed, not guessed. localStorage is shared by
 * every page of the origin, so the note arrives. The page we land on reads the trip id from
 * its own sessionStorage, and only its own trip's note.
 *
 * LIMITS, AND WHY THEY ARE SAFE
 * -----------------------------
 * - Entries after the jump-off point ("Forward" history) would make the count wrong. So
 *   when the Navigation API says Forward exists, a pushState first discards it. Browsers
 *   without that API are assumed to have none.
 * - Chrome caps a tab's history at 50 entries, after which the length stops growing and
 *   cannot be used to count. Near the cap there is no jump, only an ordinary replace.
 * - Anything unexpected (no record, an old record, a count of zero) also falls back to an
 *   ordinary replace: the previous behaviour, never worse.
 */

const TRIP_KEY = 'bp-external-trip';
const LANDING_PREFIX = 'bp-external-landing:';
/** A trip older than this is not the one we are returning from. */
const MAX_TRIP_MS = 15 * 60 * 1000;
/** A landing note older than this is not for the page loading now. */
const MAX_LANDING_MS = 60 * 1000;
const HISTORY_CAP = 50;

const readJson = (storage, key) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const remove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

const safePath = (to) => (typeof to === 'string' && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard');

/** Call immediately before navigating the whole tab to another site. */
export const markExternalTripStart = () => {
  try {
    if (window.navigation?.canGoForward) {
      // Prune Forward history so history.length is the index after this entry.
      window.history.pushState(window.history.state, '', window.location.href);
    }
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(TRIP_KEY, JSON.stringify({ id, length: window.history.length, at: Date.now() }));
  } catch {
    // No sessionStorage: the return falls back to a plain replace.
  }
};

/**
 * Called on return, once the destination is safe to open (for sign-in: after the session
 * is stored). Jumps back over the trip and opens `destination` from there. Returns false
 * when it could not, and the caller should navigate normally (with replace).
 */
export const returnFromExternalTrip = (destination) => {
  const trip = readJson(sessionStorage, TRIP_KEY);
  if (!trip?.id || trip.returned || Date.now() - (Number(trip.at) || 0) > MAX_TRIP_MS) return false;

  // Marked, not removed, so this page cannot jump twice. Removing would break browsers that
  // do NOT copy sessionStorage across the trip: there the landing page reads this same
  // record to find its note. The landing page removes it once it has landed.
  try {
    sessionStorage.setItem(TRIP_KEY, JSON.stringify({ ...trip, returned: true }));
  } catch {
    return false;
  }
  if (trip.length >= HISTORY_CAP) return false;

  const added = window.history.length - trip.length;
  if (added <= 0) return false;

  try {
    localStorage.setItem(LANDING_PREFIX + trip.id, JSON.stringify({ to: safePath(destination), at: Date.now() }));
  } catch {
    return false;
  }
  window.history.go(-added);
  return true;
};

/**
 * Run at startup (main.jsx) and on a back-forward-cache restore. If this page is where a
 * returnFromExternalTrip jump landed, replace it with the destination and return true, so
 * the caller skips rendering a page that is about to be replaced.
 */
export const completeExternalTripLanding = () => {
  const trip = readJson(sessionStorage, TRIP_KEY);

  // Tidy notes that were never collected (a jump that did not land, a closed tab).
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LANDING_PREFIX) && key !== LANDING_PREFIX + trip?.id) {
        const note = readJson(localStorage, key);
        if (!note || Date.now() - (Number(note.at) || 0) > MAX_LANDING_MS) remove(localStorage, key);
      }
    }
  } catch {
    // ignore
  }

  if (!trip?.id) return false;

  const noteKey = LANDING_PREFIX + trip.id;
  const note = readJson(localStorage, noteKey);
  if (!note) return false;

  remove(localStorage, noteKey);
  remove(sessionStorage, TRIP_KEY);
  if (Date.now() - (Number(note.at) || 0) > MAX_LANDING_MS) return false;

  window.location.replace(safePath(note.to));
  return true;
};

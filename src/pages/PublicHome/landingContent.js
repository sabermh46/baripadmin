import SNAPSHOT from './landingSnapshot.json';

/**
 * What the landing page shows before the backend has answered: no blank sections, no
 * spinner, no text popping in.
 *
 * Two sources, and the newer wins:
 *  - landingSnapshot.json, the CMS content as it was when this build was made
 *    (scripts/snapshot-landing.mjs, run before every build), and
 *  - the copy this browser saved the last time the backend answered, so an edit made after
 *    the build reaches a returning visitor at once, not only after the page's request.
 *
 * Either way the page still asks the backend, and whatever it answers replaces this.
 */

const KEY = (locale) => `bp-landing:${locale}`;
const SNAPSHOT_AT = Date.parse(SNAPSHOT.generatedAt) || 0;

export function initialLanding(locale) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY(locale)));
    if (saved?.data?.hero && saved.at > SNAPSHOT_AT) return saved.data;
  } catch {
    // Private mode, cleared storage, or something unreadable: the snapshot will do.
  }
  return SNAPSHOT[locale] ?? SNAPSHOT.bn ?? {};
}

export function rememberLanding(locale, data) {
  if (!data?.hero) return;
  try {
    localStorage.setItem(KEY(locale), JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Storage full or blocked: the next visit starts from the snapshot instead.
  }
}

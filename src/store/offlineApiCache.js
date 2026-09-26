import { createStore, get, set, del, clear, entries } from 'idb-keyval';

/**
 * The last successful answer to every GET the app makes, kept so a screen can still render
 * when the network cannot answer.
 *
 * WHY NOT THE PERSISTED RTK CACHE
 * -------------------------------
 * store/index.js persists RTK Query's cache, and it looked like offline support, but it was
 * never reliable:
 *   - RTK deletes an entry `keepUnusedDataFor` after the last screen using it goes away
 *     (600s by default, 0 on the live endpoints), and it schedules that deletion for every
 *     entry restored on a reload too. The throttled persist then copies the deletion to
 *     IndexedDB. Offline, only what was open in the last ten minutes survived.
 *   - A refetch that failed offline flipped the entry to `rejected`, and the persist
 *     transform kept `fulfilled` entries only, so the data was dropped from disk at the
 *     moment it was most needed.
 * RTK's cache is a memory cache with a lifecycle built for that. This store is the durable
 * copy, and it lives by different rules: written on success, read only when the network
 * fails, evicted by age and count, never by who is looking.
 *
 * KEYED BY REQUEST, NOT BY CACHE KEY
 * ----------------------------------
 * The key is method + URL + sorted params. A queryFn endpoint can make several requests
 * under one RTK cache key (and several endpoints can make the same request), so the request
 * is the unit that actually has one answer.
 *
 * ONE USER AT A TIME
 * ------------------
 * Every key is prefixed with the user id, and the whole store is cleared on logout and when
 * a different user signs in (see offlineCacheMiddleware). `generation` guards the gap: a
 * request that started before a clear must not write its answer after it, or the previous
 * user's data would reappear in the store the next user reads from.
 */

const responses = createStore('barip-offline-api', 'responses');

/** Older than this is not worth showing, even offline. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Most entries kept; the oldest go first. Screens × filters × pages stays well under this. */
const MAX_ENTRIES = 400;
/** Prune after this many writes rather than on every one; pruning reads every key. */
const PRUNE_EVERY = 40;

let generation = 0;
let writesSincePrune = 0;

export const currentGeneration = () => generation;

/**
 * Stable identity of a GET: method, URL and params with keys sorted, so `{a,b}` and `{b,a}`
 * are the same request. Params that are null/undefined/'' are dropped, as axios drops them.
 */
export const requestKey = (args) => {
  const url = typeof args === 'string' ? args : args?.url ?? '';
  const params = (typeof args === 'object' && args?.params) || {};
  const clean = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => [k, params[k]]);

  return `GET ${url}${clean.length ? `?${JSON.stringify(clean)}` : ''}`;
};

const storageKey = (userId, key) => `${userId ?? 'anon'}|${key}`;

/** @returns {Promise<{ data: unknown, at: number } | null>} */
export const readResponse = async (userId, key) => {
  try {
    const hit = await get(storageKey(userId, key), responses);
    if (!hit || typeof hit !== 'object' || !('data' in hit)) return null;
    if (Date.now() - (Number(hit.at) || 0) > MAX_AGE_MS) return null;
    return hit;
  } catch {
    return null;
  }
};

const prune = async () => {
  try {
    const all = await entries(responses);
    const now = Date.now();
    const alive = [];
    for (const [k, v] of all) {
      if (!v || now - (Number(v.at) || 0) > MAX_AGE_MS) await del(k, responses);
      else alive.push([k, Number(v.at) || 0]);
    }
    if (alive.length > MAX_ENTRIES) {
      alive.sort((a, b) => a[1] - b[1]);
      for (const [k] of alive.slice(0, alive.length - MAX_ENTRIES)) await del(k, responses);
    }
  } catch {
    // Best effort. A full store is handled by the quota path in saveResponse.
  }
};

export const clearOfflineApiCache = async () => {
  generation += 1;
  try {
    await clear(responses);
  } catch {
    // Storage unavailable: there is nothing readable to protect either.
  }
};

/**
 * Fire-and-forget. `startedGeneration` is the generation when the request began: if the
 * store was cleared since, this answer belongs to a session that has ended.
 */
export const saveResponse = async (userId, key, data, startedGeneration) => {
  if (data === undefined || startedGeneration !== generation) return;

  try {
    await set(storageKey(userId, key), { data, at: Date.now() }, responses);
  } catch {
    // Quota exceeded (or storage unavailable). Clear rather than guess what matters least:
    // everything is rebuilt by the next successful requests.
    await clearOfflineApiCache();
    return;
  }

  writesSincePrune += 1;
  if (writesSincePrune >= PRUNE_EVERY) {
    writesSincePrune = 0;
    prune();
  }
};

import { axiosInstance } from './api/baseApi';
import { setPermissions } from './slices/authSlice';

/**
 * Keeps the browser's cached permission list honest.
 *
 * THE PROBLEM
 * -----------
 * Permissions arrive once, in the login payload, and are then cached (and persisted to
 * IndexedDB) for the whole session. The server re-reads them on every request; the browser
 * does not. So the moment an admin grants or revokes something, the two disagree:
 *
 *   - revoked → the UI still renders the button, and clicking it 403s
 *   - granted → the API would allow it, but the button is still hidden
 *
 * Neither resolves until the user happens to log out and back in, and neither looks like a
 * permissions problem from their side — the first looks like a broken button, the second
 * like the admin's change "didn't work".
 *
 * THE FIX
 * -------
 * A 403 is the signal. It is the server saying "your idea of what you may do is wrong", so
 * it is exactly the moment to re-read. One cheap GET later the cache is correct and the UI
 * re-renders with the right controls.
 *
 * This affects RENDERING ONLY. Authorisation is decided server-side on every request and is
 * unaffected by anything cached here — a stale client can never grant itself access, it can
 * only draw the wrong buttons.
 */

// Guards against a storm: one failing page can fire a dozen 403s at once, and each would
// otherwise queue its own identical request.
let inFlight = null;
let lastSyncedAt = 0;
const MIN_INTERVAL_MS = 5000;

/** Paths that must never trigger a sync, or a failure here would recurse. */
const isSyncPath = (url = '') => url.includes('/auth/permissions');

const sameSet = (a = [], b = []) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * Re-reads the caller's permissions and updates the store if they moved.
 * Returns the fresh list, or null when the read failed or was skipped.
 */
export const syncPermissions = async (dispatch, getState, { force = false } = {}) => {
  const now = Date.now();
  if (!force && now - lastSyncedAt < MIN_INTERVAL_MS) return null;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data } = await axiosInstance.get('/auth/permissions');
      const fresh = data?.permissions ?? [];
      const current = getState()?.auth?.user?.permissions ?? [];

      // Only dispatch on an actual change — writing an identical array would re-render every
      // permission-gated component in the tree for nothing.
      if (!sameSet(fresh, current)) {
        dispatch(setPermissions(fresh));
      }

      lastSyncedAt = Date.now();
      return fresh;
    } catch {
      // A failed sync is not worth surfacing: the user already has the underlying error from
      // whatever they were actually doing, and the next 403 will try again.
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};

/**
 * Adopts a permission list the server volunteered. Returns true when it handled things.
 *
 * Every 403 now carries the caller's current permissions (see bootstrap/app.php) — the
 * rejection is itself the authoritative answer to "what may I actually do?". When that is
 * present there is nothing to go and ask: the correction is already in hand, so the common
 * case costs zero extra requests.
 */
const adoptFromResponse = (dispatch, getState, body) => {
  const fresh = body?.permissions;
  if (!Array.isArray(fresh)) return false;

  const current = getState()?.auth?.user?.permissions ?? [];
  if (!sameSet(fresh, current)) {
    dispatch(setPermissions(fresh));
  }

  // Counts as a sync even when unchanged: the server has just told us the cache is right,
  // so a follow-up read would learn nothing.
  lastSyncedAt = Date.now();
  return true;
};

/**
 * Called from the query layer whenever a request comes back 403.
 *
 * Prefers the permissions embedded in the response and only falls back to a fetch when the
 * body did not carry them — an older deployment, or a 403 raised before authentication
 * resolved a user.
 */
export const handleForbidden = (dispatch, getState, url, body) => {
  if (isSyncPath(url)) return;

  const role = getState()?.auth?.user?.role?.slug;
  // web_owner and developer bypass permission checks entirely, so a 403 for them is about
  // something else (a role gate, ownership) and re-reading would tell us nothing.
  if (role !== 'staff' && role !== 'caretaker') return;

  if (adoptFromResponse(dispatch, getState, body)) return;

  syncPermissions(dispatch, getState);
};

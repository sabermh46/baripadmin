import i18n from '../i18n';
import { showMessageInLanguage } from './showMessageInLanguage';

/**
 * Turns whatever an API call failed with into a sentence a person can act on.
 *
 * Our axios baseQuery hands RTK Query `{ status, data }` and nothing else. Toast call sites
 * grew their own guesses about that shape, and four kinds of unreadable output came out:
 *
 *  1. `data.error` printed straight to the screen. Backend messages use an `English||বাংলা`
 *     convention, so about half the call sites showed both languages joined by two pipes —
 *     "Not your house||এটি আপনার বাড়ি নয়".
 *
 *  2. Validation. A 422 carries `error: "Validation failed"` with the real reasons in
 *     `errors: [{field, message}]`. Every call site read only `.error`, so a missing name
 *     field produced the words "Validation failed" and no hint of which field or why.
 *
 *  3. `error.message`, which this baseQuery never sets — the shape is `{status, data}`. Every
 *     `err?.message` fallback in the app was reading undefined. Where it was the only
 *     fallback, the toast came up blank.
 *
 *  4. No response at all — offline, DNS, timeout, server not running. Then `data` is a raw
 *     axios string: "Network Error", "timeout of 30000ms exceeded". Call sites looking for
 *     `data.error` got undefined and fell through to "Failed to save", which sends the user
 *     hunting for a mistake in their form when the real problem is their connection.
 *
 * @param {object} error     the RTK Query error ({status, data})
 * @param {string} [fallback] what to say when the server offered nothing usable
 */
export const apiErrorMessage = (error, fallback) => {
  const t = (key) => i18n.t(key);
  const data = error?.data;

  // No status means the request never reached the server.
  if (!error?.status || typeof data === 'string') {
    return t('error_no_connection');
  }

  // Validation: name the fields. One line each, because "Validation failed" tells the user
  // only that something is wrong, not what.
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((e) => showMessageInLanguage(e?.message) || e?.field)
      .filter(Boolean)
      .join('\n');
  }

  const raw = data?.error ?? data?.message;
  if (typeof raw === 'string' && raw.trim()) {
    return showMessageInLanguage(raw);
  }

  if (error.status >= 500) return t('error_server');
  if (error.status === 401) return t('error_session_expired');
  if (error.status === 403) return t('error_not_allowed');
  if (error.status === 404) return t('error_not_found');

  return fallback || t('something_went_wrong');
};

export default apiErrorMessage;

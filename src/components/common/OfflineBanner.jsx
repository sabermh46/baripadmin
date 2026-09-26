import React from 'react';
import { CloudOff, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks';

/**
 * One line above every page saying the figures on screen are a saved copy, and how old.
 *
 * Showing saved data is only honest if the screen admits it: without this, yesterday's
 * rent totals look exactly like this morning's. It covers every page at once because the
 * saved copy is served by the API layer (baseApi + store/offlineApiCache.js), so no page
 * needs its own notice.
 *
 *   offline, with saved data on screen  → "You are offline — showing your saved copy",
 *                                         and the oldest saved time among them
 *   offline, nothing saved shown yet    → "pages you have opened before still work"
 *   online, but still on a saved copy   → the server could not be reached (or the refetch
 *                                         after reconnecting has not landed yet)
 */
const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useAppSelector((s) => s.ui?.isOnline ?? true);
  const stale = useAppSelector((s) => s.ui?.offlineStale);

  const times = Object.values(stale ?? {}).filter(Boolean);
  if (isOnline && times.length === 0) return null;

  const oldest = times.length ? Math.min(...times) : null;
  const when = oldest
    ? new Date(oldest).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : null;

  const Icon = isOnline ? History : CloudOff;
  const message = !isOnline
    ? times.length
      ? t('offline_showing_saved')
      : t('offline_pages_still_work')
    : t('could_not_refresh_showing_saved');

  return (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <Icon className="h-4 w-4 shrink-0 text-amber-700" />
      <span className="font-medium">{message}</span>
      {when && <span className="text-xs text-amber-800">· {t('last_updated_at', { when })}</span>}
    </div>
  );
};

export default OfflineBanner;

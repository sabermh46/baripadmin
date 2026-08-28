import React from 'react';
import { CloudOff, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Says that what is on screen is a saved copy, and how old it is.
 *
 * Without this the fallback would be a quiet lie: the figures would look live, and someone
 * could act on yesterday's rent totals believing they were this morning's. Showing stale data
 * is only defensible if the screen admits it.
 *
 * Two wordings, because the causes call for different responses — no connection is something
 * the reader can act on; a server that will not answer is not.
 */
const StaleDataNotice = ({ isOffline, savedAt }) => {
  const { t } = useTranslation();

  const when = savedAt
    ? new Date(savedAt).toLocaleString(undefined, {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      })
    : null;

  const Icon = isOffline ? CloudOff : History;

  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 mb-4"
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {isOffline ? t('offline_showing_saved') : t('could_not_refresh_showing_saved')}
        </p>
        {when && <p className="text-xs text-amber-800 mt-0.5">{t('last_updated_at', { when })}</p>}
      </div>
    </div>
  );
};

export default StaleDataNotice;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Lock, LifeBuoy, Wallet } from 'lucide-react';

/**
 * What a lapsed owner or caretaker sees instead of the app.
 *
 * The server has always answered 402 SUBSCRIPTION_EXPIRED for these accounts, but nothing
 * on the client knew the code, so every screen rendered its own empty state with a red
 * toast over it — the app read as broken rather than locked, and nowhere said what to do.
 *
 * This is not a modal and has no dismiss. A paywall you can close is not a paywall, and an
 * owner who dismisses it lands back on the same page of zeroes. The one route out — settling
 * the fee — is the primary button, and /app-fee stays reachable because the gate's
 * allow-list lets it through.
 */
const SubscriptionBlocked = ({ validThrough, daysSinceExpiry, isCaretaker = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const validThroughText = (() => {
    if (!validThrough) return null;
    const d = new Date(validThrough);
    return Number.isNaN(d.getTime()) ? null : format(d, 'dd MMM yyyy');
  })();

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-red-900">{t('your_subscription_has_expired')}</h1>
          {validThroughText && (
            <p className="text-sm text-red-800 mt-1">
              {t('subscription_ended_on', { date: validThroughText })}
              {daysSinceExpiry > 0 && ` · ${t('expired_days_ago', { count: daysSinceExpiry })}`}
            </p>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 text-center">
            {isCaretaker ? t('subscription_expired_caretaker') : t('subscription_expired_limited')}
          </p>

          {/* Nothing here is destructive and nothing is lost — worth saying, because the
              first fear on hitting a wall like this is that the data is gone. */}
          <p className="text-xs text-gray-500 text-center bg-gray-50 rounded-lg px-3 py-2">
            {t('subscription_data_safe')}
          </p>

          <button
            type="button"
            onClick={() => navigate('/app-fee')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            <Wallet className="h-4 w-4" />
            {t('pay_now')}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <LifeBuoy className="h-3.5 w-3.5" />
            {t('subscription_contact_support')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBlocked;

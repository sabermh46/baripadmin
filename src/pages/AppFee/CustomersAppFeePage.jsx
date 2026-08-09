import React, { useState } from 'react';
import {
  useGetAppFeePaymentsQuery,
  useGetAppFeeStatusQuery,
  useGetAppFeeDueQuery,
} from '../../store/api/appFeeApi';
import { useAuth } from '../../hooks';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import { ContentLoader } from '../../components/common/RouteLoader';
import { AlertTriangle, BadgeCheck, CalendarClock, Clock, Home, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

const fmt = (value, pattern = 'dd MMM yyyy') => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, pattern);
};

/**
 * The invoice an owner should act on: still pending, and raised by an admin (or the monthly
 * cron, which attributes itself to the platform's web_owner). An owner cannot settle an
 * invoice they raised themselves, so those are excluded — the "Already paid?" flow only
 * makes sense against something the platform is asking them to pay.
 */
const selectActionableInvoice = (payments = []) => {
  const candidates = payments
    .filter((p) => p.status === 'pending')
    .filter((p) => ['web_owner', 'staff'].includes(p.metadata?.createdBy?.role))
    .sort((a, b) => new Date(a.start_date ?? 0) - new Date(b.start_date ?? 0));

  return candidates[0] ?? null;
};

/** Big, unambiguous statement of where the subscription stands. */
const StatusPanel = ({ status, due }) => {
  const { t } = useTranslation();

  if (!status) return null;

  const tone = status.isBlocked
    ? { wrap: 'bg-red-50 border-red-200', chip: 'bg-red-100 text-red-800', Icon: AlertTriangle, iconTone: 'text-red-600' }
    : status.inGracePeriod
      ? { wrap: 'bg-amber-50 border-amber-200', chip: 'bg-amber-100 text-amber-800', Icon: Clock, iconTone: 'text-amber-600' }
      : status.isActive
        ? { wrap: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-100 text-emerald-800', Icon: BadgeCheck, iconTone: 'text-emerald-600' }
        : { wrap: 'bg-gray-50 border-gray-200', chip: 'bg-gray-100 text-gray-700', Icon: CalendarClock, iconTone: 'text-gray-500' };

  const label = status.isBlocked
    ? t('subscription_expired')
    : status.inGracePeriod
      ? t('subscription_grace_period')
      : status.isActive
        ? t('subscription_active')
        : status.hasEverPaid
          ? t('subscription_starts_soon')
          : t('subscription_not_started');

  const headline = status.isBlocked
    ? t('your_subscription_has_expired')
    : status.inGracePeriod
      ? t('grace_days_left_headline', { count: status.graceDaysRemaining })
      : status.isActive
        ? t('days_remaining_headline', { count: status.daysRemaining })
        : status.hasEverPaid
          ? t('next_period_not_started')
          : t('no_subscription_yet');

  const { Icon } = tone;

  return (
    <div className={`border rounded-xl p-4 sm:p-5 ${tone.wrap}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${tone.iconTone}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tone.chip}`}>{label}</span>
            {status.coveredDaysTotal > 0 && (
              <span className="text-[11px] text-gray-500">
                {t('days_purchased_total', { count: status.coveredDaysTotal })}
              </span>
            )}
          </div>

          <p className="text-lg font-semibold text-gray-900 mt-1.5">{headline}</p>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-600">
            {status.validThrough && (
              <p>
                <span className="text-gray-500">{t('valid_through')}</span>{' '}
                <span className="font-medium text-gray-800">{fmt(status.validThrough)}</span>
              </p>
            )}
            {status.blockAfter && !status.isBlocked && (
              <p>
                <span className="text-gray-500">{t('access_paused_on')}</span>{' '}
                <span className="font-medium text-gray-800">{fmt(status.blockAfter)}</span>
              </p>
            )}
            {due && (
              <p>
                <span className="text-gray-500">{t('next_charge')}</span>{' '}
                <span className="font-medium text-gray-800">{money(due.totalDue)}</span>
                <span className="text-gray-500">
                  {' '}
                  ({t('active_houses_count', { count: due.activeHouseCount })})
                </span>
              </p>
            )}
          </div>

          {status.isBlocked && (
            <p className="text-xs text-red-800 mt-2">{t('read_only_until_confirmed')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomersAppFeePage = () => {
  const { t } = useTranslation();
  const [viewEditId, setViewEditId] = useState(null);
  const { user } = useAuth();

  const { data: listResponse, isLoading } = useGetAppFeePaymentsQuery({ page: 1, limit: 50 });
  const { data: status } = useGetAppFeeStatusQuery(user?.id, { skip: !user?.id });
  const { data: due } = useGetAppFeeDueQuery(user?.id, { skip: !user?.id });

  const payments = listResponse?.data ?? [];
  const actionable = selectActionableInvoice(payments);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('app_fee_and_subscription')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('app_fee_owner_subtitle')}</p>
      </div>

      <StatusPanel status={status} due={due} />

      {actionable && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              {t('invoice_awaiting_payment', { id: actionable.id })}
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{money(actionable.amount)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {t('covers_days_from', {
                days: actionable.subscription_days ?? 30,
                date: fmt(actionable.start_date) ?? '—',
              })}
              {actionable.house_count
                ? ` · ${t('active_houses_count', { count: actionable.house_count })}`
                : ''}
            </p>
            {actionable.metadata?.waiting_for_confirm && (
              <p className="text-xs text-amber-700 mt-1.5 font-medium">
                {t('reported_as_paid_waiting')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setViewEditId({ id: actionable.id, forceEditable: true, defaultStatus: 'paid' })
            }
            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
          >
            {actionable.metadata?.waiting_for_confirm ? t('update_payment_details') : t('i_have_paid_this')}
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-2">{t('payment_history')}</h2>

        {isLoading ? (
          <ContentLoader />
        ) : payments.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Home className="h-6 w-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('no_app_fee_invoices_yet')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('invoice_appears_when_raised')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="border border-gray-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {money(p.amount)}
                    <span className="ml-2 text-xs font-normal text-gray-500">#{p.id}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {/* The period this invoice buys — start plus its own day count. Was
                        previously printed as "Due <start + days>", which labelled the END of
                        the paid period as though it were a payment deadline. */}
                    {p.start_date ? `${fmt(p.start_date)} · ${t('days_count', { count: p.subscription_days ?? 30 })}` : '—'}
                    {p.paid_date ? ` · ${t('paid')} ${fmt(p.paid_date)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === 'pending' && p.metadata?.waiting_for_confirm && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {t('awaiting_verification')}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : p.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : p.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : p.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {p.status || '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewEditId({ id: p.id })}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {t('details')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppFeeViewEditModal
        paymentId={viewEditId?.id}
        isOpen={!!viewEditId}
        onClose={() => setViewEditId(null)}
        onSuccess={() => setViewEditId(null)}
        forceEditable={!!viewEditId?.forceEditable}
        defaultStatus={viewEditId?.defaultStatus}
      />
    </div>
  );
};

export default CustomersAppFeePage;

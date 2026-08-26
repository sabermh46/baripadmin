import React, { useState } from 'react';
import { useGetMyAppFeeQuery } from '../../store/api/appFeeApi';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import AppFeeCreateModal from './AppFeeCreateModal';
import ReportPaymentModal from './ReportPaymentModal';
import { ContentLoader } from '../../components/common/RouteLoader';
import { AlertTriangle, BadgeCheck, CalendarClock, Clock, Home, Receipt, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { invoicePeriod } from '../../utils/appFeePeriod';

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

const fmt = (value, pattern = 'dd MMM yyyy') => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, pattern);
};

// The "which invoice should this owner act on" rule used to live here as
// selectActionableInvoice(). It now comes back as `actionable` on the same response, so the
// definition — pending, and raised by the platform rather than by the owner — exists once,
// on the server, next to the data it filters.

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
  const [reportOpen, setReportOpen] = useState(false);
  // The invoice being claimed against, or null. Holds the row itself rather than an id:
  // /app-fees/me already returned it, so re-fetching it to fill a four-field form would
  // be a round trip for data we are looking at.
  const [claimFor, setClaimFor] = useState(null);

  // One request instead of three. The house owner is resolved server-side, which is also
  // what fixes this page for caretakers — it used to send the caretaker's own user id as a
  // house-owner id, so status and due both came back 403 and the panel silently vanished.
  // Backstop only. Push invalidation (App.jsx) covers the instant an admin is notified;
  // this catches the cases push cannot — permission never granted, a lapsed subscription,
  // or a change made by someone else with no notification attached. Paused while the tab is
  // in the background so it costs nothing when nobody is looking.
  const { data, isLoading } = useGetMyAppFeeQuery(undefined, {
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });

  const status = data?.status;
  const due = data?.due;
  const payments = data?.payments ?? [];
  const actionable = data?.actionable ?? null;

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
            {/* A refused claim used to be completely invisible here: the invoice simply went
                back to unpaid with no message, so "we confirmed it" and "we could not find
                it" looked identical from the owner's side. */}
            {actionable.metadata?.claim_rejected && (
              <div className="mb-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5">
                <p className="text-xs font-semibold text-red-800">{t('payment_could_not_be_confirmed')}</p>
                {actionable.metadata.claim_rejected.reason && (
                  <p className="text-xs text-red-700 mt-0.5">{actionable.metadata.claim_rejected.reason}</p>
                )}
                <p className="text-[11px] text-red-600 mt-1">{t('check_transaction_number_and_resubmit')}</p>
              </div>
            )}
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              {t('invoice_awaiting_payment')}
            </p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{money(actionable.amount)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {t('covers_period_short', { period: invoicePeriod(actionable) ?? '—' })}
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
            onClick={() => setClaimFor(actionable)}
            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
          >
            {actionable.metadata?.waiting_for_confirm ? t('update_payment_details') : t('i_have_paid_this')}
          </button>
        </div>
      )}

      {/* No pending invoice raised for them, and nothing covering today.
          Until now this page simply had no button in that state: the "I have paid this"
          action hangs off `actionable`, which only exists once an admin has raised an
          invoice. So an owner who was never invoiced — or whose subscription had lapsed
          without a fresh invoice — arrived here with no way to pay anything, which is a dead
          end at the exact moment the banner and the paywall are both telling them to pay.
          The API has always allowed a house owner to submit their own payment. */}
      {!actionable && status && !status.isActive && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-primary" />
              {status.hasEverPaid ? t('renew_your_subscription') : t('start_your_subscription')}
            </p>
            {due && (
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {money(due.totalDue)}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {t('active_houses_count', { count: due.activeHouseCount })}
                </span>
              </p>
            )}
            <p className="text-xs text-gray-600 mt-1">{t('submit_payment_for_verification')}</p>
          </div>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
          >
            {t('report_payment')}
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
                  <p className="text-sm font-semibold text-gray-900">{money(p.amount)}</p>
                  {/* The period identifies the invoice now — the raw row id used to sit here,
                      and it told this owner more about the platform's other customers than
                      about their own bill. */}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {invoicePeriod(p) ?? '—'}
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

      {reportOpen && (
        <AppFeeCreateModal
          isOpen
          onClose={() => setReportOpen(false)}
          onSuccess={() => setReportOpen(false)}
        />
      )}

      {/* Keyed and conditionally mounted, so each claim gets a component seeded from its own
          invoice rather than one long-lived form kept in step by an effect. */}
      {claimFor && (
        <ReportPaymentModal
          key={claimFor.id}
          payment={claimFor}
          isOpen
          onClose={() => setClaimFor(null)}
          onSuccess={() => setClaimFor(null)}
        />
      )}

      {/* Read-only from here. The owner's "Details" is a look at the invoice, not an edit of
          it — the edit form belongs to whoever verifies the claim. */}
      <AppFeeViewEditModal
        key={viewEditId?.id ?? 'none'}
        paymentId={viewEditId?.id}
        isOpen={!!viewEditId}
        onClose={() => setViewEditId(null)}
        onSuccess={() => setViewEditId(null)}
      />
    </div>
  );
};

export default CustomersAppFeePage;

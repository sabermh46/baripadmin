import React from 'react';
import { AlertTriangle, BadgeCheck, CalendarClock, Clock, Receipt, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { invoicePeriod } from '../../utils/appFeePeriod';
import SubscriptionTimeline from './SubscriptionTimeline';

/**
 * One house owner's subscription: where it stands, and every day of it on the timeline.
 *
 * Shared by the owner's own app-fee page and the admin's per-owner modal
 * (SubscriptionTimelineModal), so both look at the same thing in the same way. Both read
 * the /app-fees/me payload (the admin passes house_owner_id).
 *
 * The owner's actions ("I have paid this", "Report payment") appear only when their handlers
 * are passed. Admins do not pay on an owner's behalf here; they verify claims from the
 * app-fee list. Without `onDetails`, invoices are shown but not opened.
 */
const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

const fmt = (value, pattern = 'dd MMM yyyy') => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : format(d, pattern);
};

const TONE = {
  blocked: { wrap: 'border-red-200', chip: 'bg-red-100 text-red-800', Icon: AlertTriangle, icon: 'text-red-600', bar: 'bg-red-500' },
  grace: { wrap: 'border-amber-200', chip: 'bg-amber-100 text-amber-800', Icon: Clock, icon: 'text-amber-600', bar: 'bg-amber-500' },
  active: { wrap: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-800', Icon: BadgeCheck, icon: 'text-emerald-600', bar: 'bg-emerald-500' },
  none: { wrap: 'border-slate-200', chip: 'bg-slate-100 text-slate-700', Icon: CalendarClock, icon: 'text-slate-500', bar: 'bg-slate-400' },
};

/**
 * Where the subscription stands, and the one thing to do about it, in a single card.
 *
 * The progress bar is today's place in the current stretch (the paid period, or the grace
 * period), taken from the same server timeline the axis draws, so the two always agree.
 */
const StatusCard = ({ status, due, current, actionable, onPay, onReport }) => {
  const { t } = useTranslation();
  if (!status) return null;

  const key = status.isBlocked ? 'blocked' : status.inGracePeriod ? 'grace' : status.isActive ? 'active' : 'none';
  const tone = TONE[key];
  const { Icon } = tone;

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

  const progress = current?.days && current.dayNumber ? Math.min(100, Math.round((current.dayNumber / current.days) * 100)) : null;

  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${tone.wrap}`}>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${tone.icon}`} />
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone.chip}`}>{label}</span>
          {status.coveredDaysTotal > 0 && (
            <span className="text-[11px] text-slate-500">{t('days_purchased_total', { count: status.coveredDaysTotal })}</span>
          )}
        </div>

        <p className="mt-2 text-xl font-semibold text-slate-900">{headline}</p>

        {progress !== null && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${progress}%` }} />
          </div>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          {status.validThrough && (
            <div>
              <dt className="text-slate-500">{t('valid_through')}</dt>
              <dd className="font-medium text-slate-800">{fmt(status.validThrough)}</dd>
            </div>
          )}
          {status.blockAfter && !status.isBlocked && (
            <div>
              <dt className="text-slate-500">{t('access_paused_on')}</dt>
              <dd className="font-medium text-slate-800">{fmt(status.blockAfter)}</dd>
            </div>
          )}
          {due && (
            <div>
              <dt className="text-slate-500">{t('next_charge')}</dt>
              <dd className="font-medium text-slate-800">
                {money(due.totalDue)} <span className="font-normal text-slate-500">· {t('active_houses_count', { count: due.activeHouseCount })}</span>
              </dd>
            </div>
          )}
        </dl>

        {status.isBlocked && onPay && <p className="mt-2 text-xs text-red-800">{t('read_only_until_confirmed')}</p>}
      </div>

      {/* The next action, attached to the status it answers. */}
      {actionable ? (
        <div className="border-t border-slate-100 bg-primary-50/40 p-4">
          {/* A refused claim used to be completely invisible here: the invoice simply went
              back to unpaid with no message, so "we confirmed it" and "we could not find it"
              looked identical from the owner's side. */}
          {actionable.metadata?.claim_rejected && (
            <div className="mb-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5">
              <p className="text-xs font-semibold text-red-800">{t('payment_could_not_be_confirmed')}</p>
              {actionable.metadata.claim_rejected.reason && (
                <p className="mt-0.5 text-xs text-red-700">{actionable.metadata.claim_rejected.reason}</p>
              )}
              {onPay && <p className="mt-1 text-[11px] text-red-600">{t('check_transaction_number_and_resubmit')}</p>}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Receipt className="h-3.5 w-3.5 text-primary-600" />
                {t('invoice_awaiting_payment')}
              </p>
              <p className="text-lg font-semibold text-slate-900">{money(actionable.amount)}</p>
              <p className="text-[11px] text-slate-500">
                {t('covers_period_short', { period: invoicePeriod(actionable) ?? '—' })}
                {actionable.house_count ? ` · ${t('active_houses_count', { count: actionable.house_count })}` : ''}
              </p>
              {actionable.metadata?.waiting_for_confirm && (
                <p className="mt-1 text-xs font-medium text-amber-700">{t('reported_as_paid_waiting')}</p>
              )}
            </div>
            {onPay && (
              <button
                type="button"
                onClick={() => onPay(actionable)}
                className="shrink-0 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                {actionable.metadata?.waiting_for_confirm ? t('update_payment_details') : t('i_have_paid_this')}
              </button>
            )}
          </div>
        </div>
      ) : (
        // No invoice raised, and nothing covering today. Without this the page had no button
        // at all in that state, a dead end at the moment the banner and the paywall are both
        // saying "pay". The API has always let a house owner submit their own payment.
        !status.isActive && onReport && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-primary-50/40 p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Wallet className="h-3.5 w-3.5 text-primary-600" />
                {status.hasEverPaid ? t('renew_your_subscription') : t('start_your_subscription')}
              </p>
              {due && <p className="text-lg font-semibold text-slate-900">{money(due.totalDue)}</p>}
              <p className="text-[11px] text-slate-500">{t('submit_payment_for_verification')}</p>
            </div>
            <button
              type="button"
              onClick={onReport}
              className="shrink-0 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              {t('report_payment')}
            </button>
          </div>
        )
      )}
    </div>
  );
};

/** A plain invoice list, for an API from before the timeline existed (no `timeline` sent). */
const FallbackList = ({ payments, onDetails }) => {
  const { t } = useTranslation();
  if (!payments.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-700">{t('payment_history')}</h2>
      {payments.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{money(p.amount)}</p>
            <p className="text-xs text-slate-600">
              {invoicePeriod(p) ?? '—'}
              {p.paid_date ? ` · ${t('paid')} ${fmt(p.paid_date)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{p.status || '—'}</span>
            {onDetails && (
              <button
                type="button"
                onClick={() => onDetails(p.id)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {t('details')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * @param {object}   props.data       the /app-fees/me payload
 * @param {Function} [props.onPay]    owner only: claim an invoice as paid
 * @param {Function} [props.onReport] owner only: report a payment with no invoice raised
 * @param {Function} [props.onDetails] open one invoice by id
 */
const SubscriptionOverview = ({ data, onPay, onReport, onDetails }) => {
  const payments = data?.payments ?? [];
  const timeline = data?.timeline;
  const current = timeline?.segments?.find((s) => s.timing === 'current') ?? null;

  return (
    <div className="space-y-4">
      <StatusCard
        status={data?.status}
        due={data?.due}
        current={current}
        actionable={data?.actionable ?? null}
        onPay={onPay}
        onReport={onReport}
      />
      {/* Replaces the flat payment-history list: every invoice is on the timeline, at the
          days it covers (paid) or would cover (awaiting payment). */}
      {timeline ? (
        <SubscriptionTimeline
          timeline={timeline}
          payments={payments}
          onDetails={onDetails}
          onPay={onPay}
          actionableId={data?.actionable?.id}
        />
      ) : (
        <FallbackList payments={payments} onDetails={onDetails} />
      )}
    </div>
  );
};

export default SubscriptionOverview;

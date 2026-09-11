// components/dashboard/UpcomingPayments.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, ChevronRight, CalendarCheck2 } from 'lucide-react';
import { UPCOMING_MODES, readUpcomingMode, writeUpcomingMode } from '../../utils/upcomingMode';
import { useTranslation } from 'react-i18next';
import TkSymbol from '../common/TkSymbol';
import { money, dateLocaleFor, formatShortDate, partialOf } from '../../utils/paymentDisplay';

/**
 * Urgency drives the whole row, not just a pill.
 *
 * Every card used to be the same blue regardless of state, so rent five days late looked
 * exactly like rent due in three weeks — the only difference was small text inside a badge.
 * The accent stripe is what makes the list scannable at a glance.
 *
 * Three states, not two: "this month" is scoped by for_month and says nothing about the due
 * date, so it legitimately contains invoices that fell due weeks ago. Those arrive with
 * days_left clamped to 0, which read as "Due Today" — rent 27 days late shown as due this
 * morning.
 */
const urgency = (payment) => {
  const overdue = payment.days_overdue ?? 0;
  const left = payment.days_left ?? 0;

  if (overdue > 0) {
    return {
      key: 'overdue', days: overdue,
      pill: 'bg-red-100 text-red-700 border-red-200',
      accent: 'border-l-red-500', tint: 'bg-red-50/60 hover:bg-red-50',
    };
  }
  if (left === 0) {
    return {
      key: 'today', days: 0,
      pill: 'bg-red-50 text-red-600 border-red-200',
      accent: 'border-l-red-400', tint: 'bg-red-50/40 hover:bg-red-50',
    };
  }
  if (left <= 3) {
    return {
      key: 'left', days: left,
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'border-l-amber-400', tint: 'bg-amber-50/40 hover:bg-amber-50',
    };
  }
  if (left <= 7) {
    return {
      key: 'left', days: left,
      pill: 'bg-orange-50 text-orange-700 border-orange-200',
      accent: 'border-l-orange-300', tint: 'bg-orange-50/30 hover:bg-orange-50',
    };
  }
  return {
    key: 'left', days: left,
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    accent: 'border-l-slate-300', tint: 'bg-slate-50/60 hover:bg-slate-100',
  };
};

/**
 * Hoisted rather than declared inside UpcomingPayments: a component created during render is
 * a new type on each pass, so React discards and rebuilds the toggle every time the list
 * re-renders.
 */
const ModeButton = ({ label, active, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={active}
    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {label}
  </button>
);

const UpcomingPayments = ({ payments = [], paymentsThisMonth = [] }) => {
  /**
   * Two honest answers to "what is coming up", and owners bill differently enough that
   * neither is right for everyone:
   *
   *   days  — unsettled and due in the next 30 days. A rolling window.
   *   month — everything unsettled for the month we are now in, whatever its due date.
   *
   * They disagree in both directions. This month's rent that fell due last week is missing
   * from the rolling window (it counts as overdue); an invoice raised early for next month
   * sits inside the rolling window while having nothing to do with this month's rent.
   *
   * Read from localStorage at mount rather than held in a store: it is one owner's view
   * preference on one device, it needs no server round trip to change, and the dashboard
   * already has both lists in hand so switching is instant.
   */
  const [mode, setMode] = useState(readUpcomingMode);
  const isMonth = mode === UPCOMING_MODES.MONTH;

  const chooseMode = (next) => {
    setMode(next);
    writeUpcomingMode(next);
  };

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const locale = dateLocaleFor(i18n.language);

  /**
   * Most urgent first. The API orders the rolling window by due date, but the this-month
   * list is scoped by for_month and can hold long-overdue rows in any order — so the thing
   * needing attention soonest was not reliably at the top.
   *
   * Sorted on a copy: the props belong to the dashboard, and the offline fallback may hand
   * the same array to more than one consumer.
   */
  const shown = useMemo(() => {
    const list = isMonth ? paymentsThisMonth : payments;
    return [...list].sort((a, b) => {
      const aOver = a.days_overdue ?? 0;
      const bOver = b.days_overdue ?? 0;
      if (aOver !== bOver) return bOver - aOver;            // longest overdue first
      return (a.days_left ?? 0) - (b.days_left ?? 0);       // then soonest due
    });
  }, [isMonth, payments, paymentsThisMonth]);

  const totals = useMemo(() => shown.reduce((acc, p) => {
    const due = Number(p.amount ?? 0);
    acc.due += due;
    if ((p.days_overdue ?? 0) > 0) {
      acc.overdue += due;
      acc.overdueCount += 1;
    }
    return acc;
  }, { due: 0, overdue: 0, overdueCount: 0 }), [shown]);

  const openPayment = (flatId) => {
    if (flatId) navigate(`/flats/${flatId}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-800 truncate">{t('upcoming_payments')}</h3>
              {/* The count belongs to whichever list is on screen — showing the other one's
                  total next to these rows is how a dashboard starts contradicting itself. */}
              <span className="shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold tabular-nums">
                {shown.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isMonth ? t('unsettled_for_this_month') : t('due_within_30_days')}
            </p>
          </div>

          <div className="flex shrink-0 rounded-lg border border-gray-200 p-0.5" role="group">
            <ModeButton
              label={t('this_month')}
              active={isMonth}
              onSelect={() => chooseMode(UPCOMING_MODES.MONTH)}
            />
            <ModeButton
              label={t('next_30_days')}
              active={!isMonth}
              onSelect={() => chooseMode(UPCOMING_MODES.DAYS)}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {shown.length > 0 ? (
        <ul className="p-2 space-y-2">
          {shown.map((payment) => {
            const state = urgency(payment);

            const part = partialOf(payment);
            const outstanding = Number(payment.amount ?? 0);

            return (
              <li key={payment.id}>
                {/* A real button: the row was a div with onClick, so it could not be reached
                    or activated from the keyboard. */}
                <button
                  type="button"
                  onClick={() => openPayment(payment.flat?.id)}
                  className={`group w-full text-left border border-gray-200 border-l-4 ${state.accent} ${state.tint} rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40`}
                >
                  {/* Flat and amount. The amount is the reason this list exists, so it reads
                      as primary rather than sitting in a small grey chip. */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {payment.flat?.name || payment.flat?.number || '—'}
                      </p>
                      {payment.house?.name && (
                        <p className="text-xs text-gray-500 truncate">{payment.house.name}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
                        <TkSymbol />{money(outstanding)}
                      </p>
                      {part.isPartial && (
                        <p className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
                          {t('of_invoice_total', { total: money(part.invoice) })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Urgency, due date, renter — a wrapping row rather than a 2-column grid,
                      which forced "Heavy Renter" and the date onto two lines each in this
                      narrow column. */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                    <span className={`px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${state.pill}`}>
                      {state.key === 'overdue' && t('overdue_by_days', { days: state.days })}
                      {state.key === 'today' && t('due_today')}
                      {state.key === 'left' && t('days_left', { count: state.days })}
                    </span>

                    <span className="inline-flex items-center gap-1 text-gray-500 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {formatShortDate(payment.due_date, locale)}
                    </span>

                    {payment.renter?.name && (
                      <span className="inline-flex items-center gap-1 text-gray-500 min-w-0">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{payment.renter.name}</span>
                      </span>
                    )}

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors ml-auto shrink-0" />
                  </div>

                  {/* Real progress, not decoration.
                      The old bar plotted days_left against an arbitrary 7-day window, so it
                      filled up as the deadline approached and told the owner nothing they
                      could act on — and its "blue" branch was unreachable, since the block
                      only rendered when days_left <= 7. This shows how much of the invoice
                      has actually been collected, which is information the API was already
                      sending. */}
                  {part.isPartial && (
                    <div className="mt-2.5">
                      <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${part.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-700 tabular-nums">
                        {t('paid_of_total', { paid: money(part.paid), total: money(part.invoice) })}
                      </p>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-6 py-10 text-center">
          <CalendarCheck2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-600 mb-1">{t('no_upcoming_payments')}</h4>
          {/* Matched to the mode. This always claimed "nothing due in the next 30 days",
              which is the wrong sentence while the section is scoped to this month. */}
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            {isMonth
              ? t('nothing_unsettled_this_month')
              : t('you_have_no_payments_due_in_the_next_30_days')}
          </p>
        </div>
      )}

      {/* Footer. The old one spent half its width telling the owner they could click a row;
          the same space now carries what is actually overdue, which is the number that
          decides whether they need to do something today. */}
      {shown.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-xs text-gray-600">
            {t('total_due')}:{' '}
            <span className="font-bold text-gray-900 tabular-nums">
              <TkSymbol />{money(totals.due)}
            </span>
          </span>

          {totals.overdueCount > 0 && (
            <span className="text-xs font-semibold text-red-600 tabular-nums whitespace-nowrap">
              <TkSymbol />{money(totals.overdue)} {t('overdue')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingPayments;

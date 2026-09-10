import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, User, ChevronRight, CheckCircle2, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TkSymbol from '../common/TkSymbol';
import { money, dateLocaleFor, formatShortDate, formatMonth, partialOf } from '../../utils/paymentDisplay';

/**
 * Severity escalates with lateness, and drives the whole row rather than one badge.
 *
 * Every row here is overdue, so "overdue" alone is not the useful distinction — three days
 * late and three months late are different problems and previously looked near-identical.
 * The thresholds match what this component already used; what is new is that they also set
 * the accent stripe, so the list can be triaged without reading any of it.
 */
const severity = (daysOverdue) => {
  if (daysOverdue >= 30) {
    return {
      pill: 'bg-red-100 text-red-700 border-red-300',
      accent: 'border-l-red-600', tint: 'bg-red-50/70 hover:bg-red-100/70',
    };
  }
  if (daysOverdue >= 7) {
    return {
      pill: 'bg-orange-100 text-orange-700 border-orange-300',
      accent: 'border-l-orange-500', tint: 'bg-orange-50/60 hover:bg-orange-100/60',
    };
  }
  return {
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
    accent: 'border-l-amber-400', tint: 'bg-amber-50/50 hover:bg-amber-100/50',
  };
};

const OverduePayments = ({ payments = [] }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = dateLocaleFor(i18n.language);

  /**
   * Worst first. The API already orders by due date ascending, which is the same thing — this
   * is defensive, because `useOfflineFallback` can serve a cached payload and the sort costs
   * nothing. Done on a copy: the array belongs to the dashboard.
   */
  const shown = useMemo(
    () => [...payments].sort((a, b) => (b.days_overdue ?? 0) - (a.days_overdue ?? 0)),
    [payments],
  );

  const totals = useMemo(() => shown.reduce((acc, p) => {
    acc.due += Number(p.amount ?? 0);
    // Money already collected against these invoices, which the card was discarding
    // entirely. Worth a line in the footer: it is the difference between "৳123,000 is
    // missing" and "৳123,000 of ৳143,000 is still missing".
    acc.collected += Number(partialOf(p).paid);
    return acc;
  }, { due: 0, collected: 0 }), [shown]);

  const openPayment = (flatId) => {
    if (flatId) navigate(`/flats/${flatId}`);
  };

  return (
    <div className="bg-white rounded-xl border border-red-200 overflow-hidden mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-red-100 bg-red-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-800 truncate">{t('overdue_payments')}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{t('payments_past_due_date')}</p>
            </div>
          </div>
          <span className="shrink-0 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold tabular-nums">
            {shown.length}
          </span>
        </div>
      </div>

      {/* List */}
      {shown.length > 0 ? (
        <ul className="p-2 space-y-2">
          {shown.map((payment) => {
            const days = payment.days_overdue ?? 0;
            const state = severity(days);
            const part = partialOf(payment);
            const month = formatMonth(payment.for_month, locale);

            return (
              <li key={payment.id}>
                {/* A real button: the row was a div with onClick, so it could not be reached
                    or activated from the keyboard. */}
                <button
                  type="button"
                  onClick={() => openPayment(payment.flat?.id)}
                  className={`group w-full text-left border border-gray-200 border-l-4 ${state.accent} ${state.tint} rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/50`}
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
                      <p className="font-bold text-red-700 tabular-nums whitespace-nowrap">
                        <TkSymbol />{money(payment.amount)}
                      </p>
                      {part.isPartial && (
                        <p className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
                          {t('of_invoice_total', { total: money(part.invoice) })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* A wrapping row rather than a 2-column grid, which forced the date and
                      the renter name onto two lines each in this narrow column. */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                    {/* Was `${days} days overdue` built in JavaScript — untranslated English
                        inside an otherwise Bengali card. The key already existed.
                        The old `days_overdue === 0 ? 'Due Today'` branch is gone with it:
                        scopeOverdue() requires due_date < today, so nothing in this list can
                        be due today and that branch was unreachable. */}
                    <span className={`px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${state.pill}`}>
                      {t('overdue_by_days', { days })}
                    </span>

                    {/* Which month's rent this is. Also in the payload and also discarded —
                        and it is the distinction between last month's arrears and something
                        that has been outstanding since spring. */}
                    {month && (
                      <span className="inline-flex items-center gap-1 text-gray-500 whitespace-nowrap">
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        {month}
                      </span>
                    )}

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

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors ml-auto shrink-0" />
                  </div>

                  {/* Part-paid arrears read very differently from untouched ones — a renter
                      paying something is a different conversation from one paying nothing —
                      and the card had no way to say so. */}
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
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-600 mb-1">{t('no_overdue_payments')}</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">{t('all_payments_are_up_to_date')}</p>
        </div>
      )}

      {/* Footer. The old one spent half its width explaining that rows are clickable; that
          space now carries what has already been recovered against these invoices. */}
      {shown.length > 0 && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-100 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-xs text-gray-600">
            {t('total_overdue')}:{' '}
            <span className="font-bold text-red-700 tabular-nums">
              <TkSymbol />{money(totals.due)}
            </span>
          </span>

          {totals.collected > 0 && (
            <span className="text-xs font-medium text-emerald-700 tabular-nums whitespace-nowrap">
              <TkSymbol />{money(totals.collected)} {t('already_collected')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default OverduePayments;

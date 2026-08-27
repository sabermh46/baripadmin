import React from 'react';
import { CreditCard, Pencil, Trash2, History, Landmark, CalendarDays, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import TkSymbol from '../../components/common/TkSymbol';
import { loanProgress } from '../../utils/loanProgress';

const money = (v) => (v == null ? '–' : Number(v).toLocaleString());
const day = (d) => {
  if (!d) return null;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, 'd MMM yyyy');
};

const PACE_STYLE = {
  on_track: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', key: 'on_track' },
  slightly_behind: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', key: 'slightly_behind' },
  behind: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700', key: 'behind_schedule' },
};

const SETTLED_STYLE = { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', key: 'paid' };

const IconBtn = ({ onClick, title, tone = 'muted', children }) => {
  const tones = {
    muted: 'text-subdued bg-gray-100 hover:bg-gray-200',
    primary: 'text-primary bg-primary/10 hover:bg-primary/20',
    danger: 'text-red-600 bg-red-100 hover:bg-red-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`cursor-pointer p-2 rounded-lg transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

const LoanCard = ({ loan, onRecordPayment, onViewPayments, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { amount, paid, remaining, paidPct, timePct, daysLeft, settled, pace } = loanProgress(loan);

  const style = settled ? SETTLED_STYLE : (pace ? PACE_STYLE[pace] : { bar: 'bg-primary', chip: 'bg-gray-100 text-gray-600', key: null });
  const startLabel = day(loan.start_date);
  const endLabel = day(loan.end_date);
  const paymentCount = loan.payments?.length ?? 0;

  return (
    <div className="bg-surface border border-subdued/20 rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors">
      {/* Heading */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text truncate">{loan.provider_name || t('loan')}</h3>
            <p className="text-sm text-subdued">
              {money(amount)} <TkSymbol />
              {loan.interest_rate ? <span className="ml-1">· {loan.interest_rate}%</span> : null}
            </p>
          </div>
        </div>

        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${style.chip}`}>
          {settled ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('paid')}
            </span>
          ) : (
            t(style.key ?? 'active')
          )}
        </span>
      </div>

      {/* Repayment. The bar is the money; the notch on it is where the term has reached, so
          "am I keeping up" is one glance rather than a subtraction. */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm mb-1.5">
          <span className="font-medium text-text">
            {money(paid)} <TkSymbol />
            <span className="text-subdued font-normal"> {t('of')} {money(amount)}</span>
          </span>
          <span className="text-subdued">{Math.round(paidPct)}%</span>
        </div>

        <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${paidPct}%` }} />
        </div>

        {timePct !== null && !settled && (
          <div className="relative h-3">
            {/* Sits under the bar rather than on it — a marker drawn inside the fill
                disappears the moment the fill passes it, which is exactly when it matters. */}
            <span
              className="absolute -translate-x-1/2 text-[10px] text-subdued whitespace-nowrap"
              style={{ left: `${timePct}%` }}
              title={t('term_elapsed')}
            >
              ▲
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-subdued">
          {!settled && (
            <span>
              {t('remaining')}: <span className="font-medium text-text">{money(remaining)}</span> <TkSymbol />
            </span>
          )}
          {loan.monthly_payment ? (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {money(loan.monthly_payment)} <TkSymbol /> / {t('month')}
            </span>
          ) : null}
          {paymentCount > 0 && <span>{t('payments_recorded', { n: paymentCount })}</span>}
        </div>
      </div>

      {/* Term */}
      {(startLabel || endLabel) && (
        <div className="mt-3 pt-3 border-t border-subdued/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subdued">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {startLabel ?? '–'}
            {endLabel ? ` → ${endLabel}` : ` · ${t('no_end_date')}`}
          </span>
          {/* `overdue_by_days` interpolates {{days}} and `days_left` interpolates {{count}} —
              they were written at different times. Passing the wrong one renders the
              placeholder verbatim, and there is no fallback to save it: i18next returns the
              key itself for a miss, so `t(...) || 'default'` never reaches its default. */}
          {daysLeft !== null && !settled && (
            <span className={daysLeft < 0 ? 'text-red-600 font-medium' : ''}>
              {daysLeft < 0
                ? t('overdue_by_days', { days: Math.abs(daysLeft) })
                : t('days_left', { count: daysLeft })}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-2">
        {!settled ? (
          <button
            type="button"
            onClick={() => onRecordPayment(loan)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <CreditCard size={16} />
            {t('record_payment')}
          </button>
        ) : (
          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {t('loan_fully_repaid')}
          </span>
        )}

        <div className="flex items-center gap-2">
          <IconBtn onClick={() => onViewPayments(loan)} title={t('payment_history')}>
            <History size={16} />
          </IconBtn>
          <IconBtn onClick={() => onEdit(loan)} title={t('edit_loan')}>
            <Pencil size={16} />
          </IconBtn>
          <IconBtn onClick={() => onDelete(loan)} title={t('delete_loan')} tone="danger">
            <Trash2 size={16} />
          </IconBtn>
        </div>
      </div>
    </div>
  );
};

export default LoanCard;

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BadgeCheck,
  BanknoteArrowUp,
  CalendarClock,
  CircleSlash,
  Clock,
  FileWarning,
  Hourglass,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const money = (n) =>
  n == null ? '–' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * One metric. `tone` drives the accent so the eye can triage the row without reading:
 * amber/red tiles are the ones with work behind them.
 */
const Tile = ({ icon: Icon, label, value, sub, tone = 'neutral', onClick, active }) => {
  const tones = {
    neutral: 'text-gray-600 bg-gray-100',
    positive: 'text-emerald-700 bg-emerald-100',
    warning: 'text-amber-700 bg-amber-100',
    danger: 'text-red-700 bg-red-100',
    info: 'text-blue-700 bg-blue-100',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left bg-white border rounded-xl p-4 flex items-start gap-3 transition-colors ${
        onClick ? 'hover:border-primary/60 cursor-pointer' : ''
      } ${active ? 'border-primary ring-1 ring-primary/30' : 'border-gray-200'}`}
    >
      <span className={`shrink-0 p-2 rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-gray-500 leading-tight">{label}</span>
        <span className="block text-xl font-semibold text-gray-900 leading-tight mt-0.5 truncate">
          {value}
        </span>
        {sub ? <span className="block text-[11px] text-gray-500 mt-0.5">{sub}</span> : null}
      </span>
    </Wrapper>
  );
};

const SkeletonTile = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
    <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
      <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
    </div>
  </div>
);

/**
 * Admin app-fee overview.
 *
 * Split into "money" and "subscription health" because they answer different questions:
 * the first is how the month is going, the second is who needs chasing. The actionable
 * tiles double as filters for the table below, so a count is never a dead end.
 */
const AppFeeOverview = ({ overview, isLoading, activeFilter, onFilter }) => {
  const { t } = useTranslation();

  if (isLoading && !overview) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonTile key={i} />
        ))}
      </div>
    );
  }

  if (!overview) return null;

  const { money: m, subscriptions: s, actionable: a, expiringSoonOwners = [] } = overview;

  const delta = m.collectedThisMonth - m.collectedLastMonth;
  const deltaPct =
    m.collectedLastMonth > 0 ? Math.round((delta / m.collectedLastMonth) * 100) : null;

  return (
    <div className="space-y-3 mb-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={BanknoteArrowUp}
          tone="positive"
          label={t('collected_this_month')}
          value={money(m.collectedThisMonth)}
          sub={
            deltaPct == null
              ? t('last_month_was', { amount: money(m.collectedLastMonth) })
              : `${delta >= 0 ? '▲' : '▼'} ${t('vs_last_month', { percent: Math.abs(deltaPct) })}`
          }
        />
        <Tile
          icon={Wallet}
          tone={m.outstanding > 0 ? 'warning' : 'neutral'}
          label={t('outstanding')}
          value={money(m.outstanding)}
          sub={t('awaiting_payment_overdue', { awaiting: a.awaitingPaymentCount, overdue: a.overdueCount })}
        />
        <Tile
          icon={Hourglass}
          tone={a.pendingVerificationCount > 0 ? 'warning' : 'neutral'}
          label={t('awaiting_your_verification')}
          value={a.pendingVerificationCount}
          sub={money(m.pendingVerificationAmount)}
          active={activeFilter === 'awaiting_verification'}
          onClick={() => onFilter?.('awaiting_verification')}
        />
        <Tile
          icon={TrendingUp}
          tone="info"
          label={t('monthly_recurring')}
          value={money(m.monthlyRecurringRevenue)}
          sub={t('active_houses_times_fee', { houses: s.activeHouses, fee: money(m.monthlyFeePerHouse) })}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={BadgeCheck}
          tone="positive"
          label={t('active_subscriptions')}
          value={`${s.active} / ${s.totalOwners}`}
          sub={t('house_owners_total', { count: s.totalOwners })}
        />
        <Tile
          icon={CircleSlash}
          tone={s.neverStarted > 0 ? 'danger' : 'neutral'}
          label={t('app_fee_not_started')}
          value={s.neverStarted}
          sub={t('never_had_paid_subscription')}
        />
        <Tile
          icon={Clock}
          tone={s.inGrace > 0 ? 'warning' : 'neutral'}
          label={t('in_grace_period')}
          value={s.inGrace}
          sub={t('expired_within_offset')}
        />
        <Tile
          icon={AlertTriangle}
          tone={s.blocked > 0 ? 'danger' : 'neutral'}
          label={t('blocked_lapsed')}
          value={s.blocked}
          sub={t('past_grace_access_gated')}
        />
      </div>

      {(s.expiringSoon > 0 || a.unbilledThisMonthCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {s.expiringSoon > 0 && (
            <div className="bg-white border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-gray-800">
                  {t('expiring_within_7_days', { count: s.expiringSoon })}
                </p>
              </div>
              <ul className="space-y-1">
                {expiringSoonOwners.map((o) => (
                  <li key={o.houseOwnerId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate">
                      {o.name ?? `${t('house_owner')} #${o.houseOwnerId}`}
                    </span>
                    <span className="text-amber-700 font-medium shrink-0 ml-2">
                      {o.daysRemaining === 0 ? t('expires_today') : t('days_left', { count: o.daysRemaining })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {a.unbilledThisMonthCount > 0 && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <FileWarning className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {t('owners_without_invoice_this_month', { count: a.unbilledThisMonthCount })}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{t('owners_without_invoice_hint')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppFeeOverview;

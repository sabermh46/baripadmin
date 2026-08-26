import React from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  IdCard,
  Mail,
  Percent,
  Phone,
  PiggyBank,
  Receipt,
  Sparkles,
  UserPlus,
  Wallet,
} from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import { monthRelativity } from '../../../utils/rentMonth';

const num = (n) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const monthLabel = (forMonth) => {
  if (!forMonth) return null;
  const [y, m] = String(forMonth).split('-').map(Number);
  if (!y || !m) return forMonth;
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
};

const dateLabel = (d) => {
  if (!d) return null;
  try {
    return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy');
  } catch {
    return d;
  }
};

/** A headline figure. Kept deliberately plain — the banner above it carries the colour. */
const Kpi = ({ icon: Icon, label, value, sub, tone = 'text-gray-900' }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-3.5">
    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </div>
    <p className={`text-xl font-bold mt-1.5 tabular-nums ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
  </div>
);

const Field = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2.5 py-2">
    <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <div className="text-sm text-gray-800 truncate">{children}</div>
    </div>
  </div>
);

/**
 * The banner is the whole point of the tab: one sentence saying whether this flat is owed
 * money, and one button to act on it. Everything below it is supporting detail.
 */
const RentBanner = ({ flat, rentState, onRecordPayment, onAssign, t }) => {
  if (!flat.renter_id) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
        <UserPlus className="h-7 w-7 text-gray-300 mx-auto mb-2" />
        <p className="font-semibold text-gray-800">{t('no_renter_assigned')}</p>
        <p className="text-xs text-gray-500 mt-1">{t('vacant_flat_earns_nothing')}</p>
        <button
          type="button"
          onClick={onAssign}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          {t('assign_a_renter')}
        </button>
      </div>
    );
  }

  const owed = Number(rentState?.outstanding ?? 0);
  // Late means the billed month has passed, not merely that money is owed. Rent for a month
  // still ahead of us is not a debt yet, and painting it red says otherwise.
  const when = monthRelativity(rentState?.forMonth);
  const overdue = owed > 0 && when === 'past';
  const dueThisMonth = owed > 0 && when === 'current';
  const dueLater = owed > 0 && when === 'future';

  const tone = overdue
    ? 'from-red-500 to-rose-600'
    : dueThisMonth
      ? 'from-amber-500 to-orange-600'
      : dueLater
        ? 'from-sky-500 to-blue-600'
        : 'from-emerald-500 to-teal-600';

  const Icon = overdue ? AlertTriangle : owed > 0 ? CalendarClock : CheckCircle2;

  const headline = overdue
    ? t('overdue_by_days', { days: rentState.daysOverdue })
    : owed > 0
      ? t('due_in_days', { days: rentState.daysLeft ?? 0 })
      : rentState?.paidAhead
        ? t('rent_state_paid_ahead')
        : t('all_settled');

  const detail = rentState?.forMonth
    ? `${monthLabel(rentState.forMonth)}${rentState.dueDate ? ` · ${t('due')} ${dateLabel(rentState.dueDate)}` : ''}`
    : t('no_rent_recorded');

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${tone} text-white p-5`}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">{t('rent_status')}</p>
          <p className="text-lg font-semibold leading-tight">{headline}</p>
          <p className="text-xs text-white/80 mt-0.5">{detail}</p>
        </div>

        {owed > 0 && (
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-white/70">{t('outstanding')}</p>
              <p className="text-3xl font-bold leading-none tabular-nums">
                <TkSymbol />{num(owed)}
              </p>
              {rentState.unsettledCount > 1 && (
                <p className="text-[11px] text-white/80 mt-1">
                  {t('across_periods', { count: rentState.unsettledCount })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onRecordPayment}
              className="px-4 py-2 rounded-lg bg-white text-sm font-semibold text-gray-900 hover:bg-white/90 shrink-0"
            >
              {t('record_payment')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const OverviewTab = ({
  flat,
  stats = {},
  rentState = {},
  charges = {},
  tenancy = null,
  advancePayments = [],
  availableAdvance = 0,
  setOpenPayment,
  setOpenAssignModal,
}) => {
  const { t } = useTranslation();

  const monthlyTotal = charges.monthlyTotal ?? Number(flat.rent_amount ?? 0);
  const advanceMonths = monthlyTotal > 0 ? (availableAdvance / monthlyTotal).toFixed(1) : '0';
  const settled = stats.settledCount ?? 0;
  const billed = stats.billedCount ?? 0;
  const settledPct = billed > 0 ? Math.round((settled / billed) * 100) : 0;

  return (
    <div className="space-y-4">
      <RentBanner
        flat={flat}
        rentState={rentState}
        onRecordPayment={() => setOpenPayment(true)}
        onAssign={() => setOpenAssignModal(true)}
        t={t}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={Wallet}
          label={t('monthly_total')}
          value={<><TkSymbol />{num(monthlyTotal)}</>}
          sub={
            charges.amenitiesTotal > 0
              ? t('rent_plus_amenities', { rent: num(charges.rent), amenities: num(charges.amenitiesTotal) })
              : t('base_rent')
          }
        />
        <Kpi
          icon={Receipt}
          label={t('outstanding')}
          value={<><TkSymbol />{num(stats.outstanding)}</>}
          tone={stats.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}
          sub={
            stats.overdueCount > 0
              ? t('n_overdue', { count: stats.overdueCount })
              : stats.pendingCount > 0
                ? t('n_pending', { count: stats.pendingCount })
                : t('nothing_owed')
          }
        />
        <Kpi
          icon={Sparkles}
          label={t('collected_this_year', { year: stats.year ?? '' })}
          value={<><TkSymbol />{num(stats.collectedThisYear)}</>}
          tone="text-emerald-600"
          sub={t('lifetime_total', { amount: num(stats.totalPaid) })}
        />
        <Kpi
          icon={PiggyBank}
          label={t('advance_available')}
          value={<><TkSymbol />{num(availableAdvance)}</>}
          sub={
            availableAdvance > 0
              ? t('covers_n_months', { count: advanceMonths })
              : t('no_advance_held')
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Who lives here ─────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
            {t('renter_details')}
          </h2>

          {tenancy ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                  {tenancy.renter?.name?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0">
                  <Link
                    to={`/renters?view=${tenancy.renter?.id}`}
                    className="font-bold text-gray-900 hover:text-primary truncate block"
                  >
                    {tenancy.renter?.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {tenancy.since ? t('tenant_since', { date: dateLabel(tenancy.since) }) : ''}
                  </p>
                </div>
                {tenancy.renter?.status === 'active' && (
                  <BadgeCheck className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />
                )}
              </div>

              <div className="mt-2 divide-y divide-gray-100">
                {tenancy.renter?.phone && (
                  <Field icon={Phone} label={t('phone')}>
                    <a href={`tel:${tenancy.renter.phone}`} className="hover:text-primary">
                      {tenancy.renter.phone}
                    </a>
                  </Field>
                )}
                {tenancy.renter?.email && (
                  <Field icon={Mail} label={t('email')}>
                    <a href={`mailto:${tenancy.renter.email}`} className="hover:text-primary">
                      {tenancy.renter.email}
                    </a>
                  </Field>
                )}
                {tenancy.renter?.nid && (
                  <Field icon={IdCard} label={t('nid')}>{tenancy.renter.nid}</Field>
                )}
              </div>

              {/* How this tenancy has actually gone — months settled against months billed. */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-xs text-gray-500">{t('months_settled')}</p>
                  <p className="text-sm font-semibold text-gray-800 tabular-nums">
                    {settled}/{billed}
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${settledPct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    style={{ width: `${settledPct}%` }}
                  />
                </div>
                {tenancy.lastPayment && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    {t('last_payment_line', {
                      amount: num(tenancy.lastPayment.amount),
                      date: dateLabel(tenancy.lastPayment.date),
                      month: monthLabel(tenancy.lastPayment.forMonth),
                    })}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">{t('no_renter_assigned')}</p>
              <button
                type="button"
                onClick={() => setOpenAssignModal(true)}
                className="mt-2 text-primary text-sm font-medium hover:underline"
              >
                + {t('assign_a_renter')}
              </button>
            </div>
          )}
        </section>

        {/* ── What it costs ──────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
            {t('charges_and_terms')}
          </h2>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('base_rent')}</span>
              <span className="font-medium text-gray-900 tabular-nums"><TkSymbol />{num(charges.rent)}</span>
            </div>

            {(charges.amenities ?? []).map((a, i) => (
              <div key={`${a.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">{a.name}</span>
                <span className="text-gray-700 tabular-nums"><TkSymbol />{num(a.charge)}</span>
              </div>
            ))}

            {(charges.amenities ?? []).length === 0 && (
              <p className="text-xs text-gray-400 italic">{t('no_amenities')}</p>
            )}

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-800">{t('monthly_total')}</span>
              <span className="text-lg font-bold text-gray-900 tabular-nums">
                <TkSymbol />{num(monthlyTotal)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400">
                <CalendarClock className="h-3.5 w-3.5" />
                {t('due_day')}
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {charges.dueDay ? t('day_of_month', { day: charges.dueDay }) : '—'}
              </p>
              {charges.nextDueDate && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {t('next')}: {dateLabel(charges.nextDueDate)}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-400">
                <Percent className="h-3.5 w-3.5" />
                {t('late_fee')}
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {charges.lateFeePercentage ?? 0}%
              </p>
              {stats.totalLateFees > 0 && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {t('charged_so_far', { amount: num(stats.totalLateFees) })}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Advance is only worth a panel of its own when there is some, and its one useful
          question is how many months it covers. */}
      {availableAdvance > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <PiggyBank className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">{t('advance_payments_available')}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {t('advance_breakdown', {
                  total: num(advancePayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)),
                  months: advanceMonths,
                })}
              </p>
            </div>
            <p className="ml-auto text-2xl font-bold text-emerald-700 tabular-nums">
              <TkSymbol />{num(availableAdvance)}
            </p>
            {stats.outstanding > 0 && (
              <button
                type="button"
                onClick={() => setOpenPayment(true)}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                {t('apply_to_dues')}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default OverviewTab;

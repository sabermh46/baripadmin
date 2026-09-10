import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, Banknote, Briefcase, CalendarDays, Wallet } from 'lucide-react';
import FitNumber from '../common/FitNumber';

const money = (n) =>
  n == null ? '—' : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}৳`;

/**
 * The size ladder for viewports 470px and wider.
 *
 * Below 470px this is overridden entirely: FitNumber measures the rendered figure against the
 * tile and sets an exact pixel size, because no ladder can be right there. A ladder has to
 * guess a per-character width, assume the tile is as wide as the layout maths says, and it
 * cannot see the Profile font-size preference at all — that preference moves
 * html{font-size}, and with it every rem of padding around the figure.
 *
 * From 470px up there is room for the design sizes and nothing needs measuring, so the steps
 * stay: they are cheap, they render correctly on the first paint with no measurement pass,
 * and they key on the formatted string's length, which accounts for a minus sign on a
 * loss-making month and for locales that group in lakh/crore instead of thousands.
 */
const amountSizeClass = (text) => {
  const len = String(text).length;
  if (len <= 4) return 'text-base md:text-2xl';   // "৳41,000" — the ordinary case
  if (len <= 5) return 'text-sm md:text-2xl';     // 6 digits
  if (len <= 10) return 'text-xs md:text-xl';     // 7 digits
  if (len <= 11) return 'text-[11px] md:text-xl'; // 8 digits
  if (len <= 12) return 'text-[10px] md:text-xl'; // 9 digits
  return 'text-[9px] md:text-lg';
};

/**
 * One tone per line of the ledger: money in, money out, what is left.
 *
 * Green/red/violet rather than three shades of the brand orange, because the three numbers
 * mean opposite things and the whole point of the row is telling them apart at a glance.
 */
const TONES = {
  rent: {
    icon: Banknote,
    card: 'from-emerald-50 to-emerald-50/30 border-emerald-100',
    chip: 'bg-white text-emerald-600 ring-1 ring-emerald-100',
    value: 'text-emerald-700',
  },
  expenses: {
    icon: ArrowDownCircle,
    card: 'from-rose-50 to-rose-50/30 border-rose-100',
    chip: 'bg-white text-rose-600 ring-1 ring-rose-100',
    value: 'text-rose-700',
  },
  profit: {
    icon: Briefcase,
    card: 'from-violet-50 to-violet-50/30 border-violet-100',
    chip: 'bg-white text-violet-600 ring-1 ring-violet-100',
    value: 'text-violet-700',
  },
};

const MoneyTile = ({ tone, label, value, subtext, isBengali }) => {
  const Icon = tone.icon;

  return (
    <div className={`min-w-0 rounded-xl border bg-gradient-to-b p-1.5 sm:p-3 ${tone.card}`}>
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${tone.chip}`}>
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
      </span>

      <p
        title={label}
        className={`mt-2 text-[11px] leading-snug text-slate-600 line-clamp-2 sm:text-xs ${
          isBengali ? 'font-hind-siliguri' : 'font-roboto'
        }`}
      >
        {label}
      </p>

      <FitNumber
        title={value}
        className={`mt-0.5 font-bold leading-tight tabular-nums font-google-sans-code ${tone.value} ${amountSizeClass(value)}`}
      >
        {value}
      </FitNumber>

      {subtext && (
        <p title={subtext} className="mt-1 text-[10px] leading-snug text-slate-400 line-clamp-2 sm:text-[11px]">
          {subtext}
        </p>
      )}
    </div>
  );
};

/**
 * This month's money, in three figures.
 *
 * `expectedMonthlyRent` is the subtext under the collected figure on purpose. Rent collected
 * reads as an alarming zero on the 2nd of the month, when nothing has been paid yet and
 * nothing is wrong; saying what the month is *supposed* to bring in next to it is what makes
 * the zero legible. The backend already computes it — nothing on the dashboard was reading it.
 */
const FinancialSummary = ({ rent, expenses, profit, expectedRent, occupancyRate }) => {
  const { t, i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className={`flex min-w-0 items-center gap-2 text-base font-bold text-slate-900 sm:text-lg ${isBengali ? 'font-hind-siliguri' : 'font-mooli'}`}>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Wallet className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="truncate">{t('financial_summary')}</span>
        </h2>

        {/* A label, not a control. The endpoint returns this month's figures and takes no
            month parameter, so a dropdown here would be a promise the API cannot keep. */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {t('this_month')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        <MoneyTile
          tone={TONES.rent}
          label={t('monthly_rent')}
          value={money(rent)}
          subtext={expectedRent != null ? `${t('expected_rent_total')}: ${money(expectedRent)}` : null}
          isBengali={isBengali}
        />
        <MoneyTile
          tone={TONES.expenses}
          label={t('monthly_expenses')}
          value={money(expenses)}
          subtext={t('monthly_spend')}
          isBengali={isBengali}
        />
        <MoneyTile
          tone={TONES.profit}
          label={t('monthly_profit')}
          value={money(profit)}
          subtext={
            occupancyRate != null ? t('occupancy_percent', { percent: occupancyRate }) : t('total_profit')
          }
          isBengali={isBengali}
        />
      </div>
    </section>
  );
};

export default FinancialSummary;

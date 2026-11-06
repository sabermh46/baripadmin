import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, CircleDashed, Clock, Eye, HandCoins, Hourglass,
} from 'lucide-react';
import TkSymbol from '../../components/common/TkSymbol';
import Table from '../../components/common/Table';
import { money } from '../../utils/paymentDisplay';
import { useGetRentCollectionQuery } from '../../store/api/houseOwnerAnalyticsApi';

/**
 * Rent Collection (dashboard: ভাড়া সংগ্রহের অগ্রগতি → সব দেখুন).
 *
 * The dashboard card counts flats that paid this month; this page is the money behind it, by
 * month (every flat's bill) and by year (twelve months side by side). Figures come from the
 * bills themselves (barip-php HouseOwnerAnalyticsService::getRentCollection).
 *
 * View, year, month and house live in the URL, so the dashboard can link straight to the month
 * it was showing, and the browser's back button steps through what was looked at.
 *
 * The year chart: each month a stacked bar, collected (teal) under outstanding (orange), so its
 * height is what was billed. Colours checked with the dataviz validator against white (passes;
 * the teal sits under 3:1, which the labelled table below the chart covers).
 */

const COLLECTED = '#1aa6b8'; // secondary-500
const OUTSTANDING = '#e07930'; // primary-600

const Amount = ({ value, className = '' }) => (
  <span className={`whitespace-nowrap tabular-nums ${className}`}><TkSymbol />{money(value || 0)}</span>
);

const rate = (t) => (t?.billed > 0 ? Math.round((t.collected / t.billed) * 100) : null);

// Status: icon + label, never colour alone.
const STATUS = {
  paid: { icon: Check, cls: 'bg-green-100 text-green-700' },
  partial: { icon: HandCoins, cls: 'bg-amber-100 text-amber-800' },
  pending: { icon: Hourglass, cls: 'bg-slate-100 text-slate-700' },
  overdue: { icon: AlertCircle, cls: 'bg-red-100 text-red-700' },
  not_billed: { icon: CircleDashed, cls: 'bg-white text-slate-500 ring-1 ring-slate-200' },
};

const StatusPill = ({ status, t }) => {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.cls}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden /> {t(`rc_status_${status}`)}
    </span>
  );
};

const Tile = ({ label, children, sub, dot }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4">
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      {dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden />}
      {label}
    </div>
    <div className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900">{children}</div>
    {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
  </div>
);

const Totals = ({ totals, t }) => {
  const r = rate(totals);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label={t('rc_billed')}><Amount value={totals?.billed} /></Tile>
      <Tile label={t('rc_collected')} dot={COLLECTED}><Amount value={totals?.collected} /></Tile>
      <Tile label={t('rc_outstanding')} dot={OUTSTANDING}><Amount value={totals?.outstanding} /></Tile>
      <Tile label={t('rc_rate')} sub={t('rc_flats_paid', { paid: totals?.flatsPaid ?? 0, total: totals?.flatsBilled ?? 0 })}>
        {r === null ? '–' : `${r}%`}
      </Tile>
    </div>
  );
};

// ── Year ──────────────────────────────────────────────────────────────────────

const YearChart = ({ months, monthName, onOpen, t }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...months.map((m) => m.billed));
  const H = 180;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{t('rc_chart_title')}</h2>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLLECTED }} />{t('rc_collected')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: OUTSTANDING }} />{t('rc_outstanding')}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">{t('rc_chart_note')}</p>

      <div className="relative mt-4" style={{ height: H + 24 }} onMouseLeave={() => setHover(null)}>
        <div aria-hidden className="absolute inset-x-0 border-t border-slate-200" style={{ top: H }} />
        <div className="absolute inset-x-0 top-0 flex items-end gap-1 sm:gap-2" style={{ height: H }}>
          {months.map((m, i) => {
            const collectedH = (m.collected / max) * H;
            const outstandingH = (m.outstanding / max) * H;
            const label = monthName(m.month, 'short');
            return (
              <button key={m.month} type="button"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => onOpen(m.month)}
                aria-label={`${t('rc_open_month', { month: monthName(m.month, 'long') })}: ${t('rc_billed')} ${money(m.billed)}, ${t('rc_collected')} ${money(m.collected)}, ${t('rc_outstanding')} ${money(m.outstanding)}`}
                className="relative h-full flex-1 flex flex-col justify-end items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-slate-50">
                {/* Outstanding above collected, a 2px surface gap between, rounded data-end on top. */}
                <span className="w-full max-w-9 flex flex-col">
                  {outstandingH > 0 && (
                    <span className={`block ${collectedH > 0 ? 'mb-0.5' : ''} rounded-t-[4px]`} style={{ height: outstandingH, backgroundColor: OUTSTANDING }} />
                  )}
                  {collectedH > 0 && (
                    <span className={`block ${outstandingH > 0 ? '' : 'rounded-t-[4px]'}`} style={{ height: collectedH, backgroundColor: COLLECTED }} />
                  )}
                </span>
                {/* Twelve names do not fit under a phone-width chart: there, every third month is
                    labelled, and a tap on any bar names it in the tooltip. */}
                <span className={`absolute -bottom-6 text-[11px] text-slate-500 whitespace-nowrap ${i % 3 ? 'max-sm:invisible' : ''}`}>{label}</span>
              </button>
            );
          })}
        </div>

        {hover !== null && (
          // Anchored over its bar, but kept inside the chart at both ends: the first bars'
          // tooltip opens rightwards, the last bars' leftwards.
          <div className={`pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg ${
            hover < 2 ? '' : hover >= months.length - 2 ? '-translate-x-full' : '-translate-x-1/2'
          }`}
            style={{
              left: `${((hover + (hover < 2 ? 0 : hover >= months.length - 2 ? 1 : 0.5)) / months.length) * 100}%`,
              top: Math.max(0, H - ((months[hover].billed / max) * H)) - 6,
            }}>
            <div className="font-medium mb-1">{monthName(months[hover].month, 'long')}</div>
            <div className="flex justify-between gap-4"><span className="text-white/70">{t('rc_billed')}</span><Amount value={months[hover].billed} /></div>
            <div className="flex justify-between gap-4"><span className="text-white/70">{t('rc_collected')}</span><Amount value={months[hover].collected} /></div>
            <div className="flex justify-between gap-4"><span className="text-white/70">{t('rc_outstanding')}</span><Amount value={months[hover].outstanding} /></div>
          </div>
        )}
      </div>
    </section>
  );
};

const RateBar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-16 sm:w-24 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: COLLECTED }} />
    </div>
    <span className="w-9 text-right text-xs tabular-nums text-slate-700">{value === null ? '–' : `${value}%`}</span>
  </div>
);

// Money columns for the app's shared Table: right-aligned, the outstanding one red when owed.
const moneyColumns = (t, pick) => [
  { key: 'billed', title: t('rc_billed'), cellClassName: 'text-right', render: (r) => <Amount value={pick(r).billed} className="text-slate-900" /> },
  { key: 'collected', title: t('rc_collected'), cellClassName: 'text-right', render: (r) => <Amount value={pick(r).collected} className="text-slate-900" /> },
  {
    key: 'outstanding', title: t('rc_outstanding'), cellClassName: 'text-right',
    render: (r) => <Amount value={pick(r).outstanding} className={pick(r).outstanding > 0 ? 'text-red-700 font-medium' : 'text-slate-400'} />,
  },
  { key: 'rate', title: t('rc_rate'), render: (r) => <RateBar value={rate(pick(r))} /> },
];

const YearTable = ({ months, totals, monthName, onOpen, t }) => {
  // The year's total rides as a last, bold row: the shared Table has no footer.
  const rows = [...months.map((m) => ({ ...m, key: m.month })), { ...totals, key: 'total', isTotal: true }];
  const columns = [
    {
      key: 'month', title: t('rc_month'),
      render: (r) => (r.isTotal ? <span className="font-semibold text-slate-900">{t('rc_total')}</span> : (
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(r.month); }} className="text-left">
          <span className="block font-medium text-slate-900 hover:text-primary">{monthName(r.month, 'long')}</span>
          <span className="block text-xs text-slate-500">{t('rc_flats_paid', { paid: r.flatsPaid, total: r.flatsBilled })}</span>
        </button>
      )),
    },
    ...moneyColumns(t, (r) => r),
  ];
  return (
    <Table columns={columns} data={rows} rowKey="key" striped hoverable={false}
      onRowClick={(r) => !r.isTotal && onOpen(r.month)} />
  );
};

const HouseTable = ({ byHouse, t }) => (
  <section className="space-y-2">
    <h2 className="text-base font-semibold text-slate-900">{t('rc_by_house')}</h2>
    <Table
      columns={[
        { key: 'house', title: t('rc_house'), render: (h) => <span className="font-medium text-slate-900">{h.name}</span> },
        ...moneyColumns(t, (h) => h.totals),
      ]}
      data={byHouse}
      rowKey="houseId"
      striped
      hoverable={false}
    />
  </section>
);

// ── Month ─────────────────────────────────────────────────────────────────────

const ViewFlat = ({ flatId, t }) => (
  <Link to={`/flats/${flatId}`} onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors">
    <Eye size={16} aria-hidden /> {t('view')}
  </Link>
);

const MonthDetail = ({ detail, formatDate, t }) => {
  const rows = (detail?.rows || []).map((r) => ({ ...r, key: `${r.flatId}-${r.paymentId ?? 'unbilled'}` }));
  const hasUnbilled = rows.some((r) => r.status === 'not_billed');
  if (!rows.length) {
    return <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">{t('rc_no_bills')}</p>;
  }

  const columns = [
    {
      key: 'flat', title: t('rc_flat'),
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900">{r.flatName}</div>
          <div className="text-xs text-slate-500">{r.houseName}</div>
        </div>
      ),
    },
    { key: 'renter', title: t('rc_renter'), render: (r) => <span className="text-slate-700">{r.renterName || '–'}</span> },
    {
      key: 'billed', title: t('rc_billed'), cellClassName: 'text-right',
      render: (r) => (
        <div>
          <Amount value={r.billed} className={r.status === 'not_billed' ? 'text-slate-400' : 'text-slate-900'} />
          {r.status === 'not_billed' && <div className="text-[11px] text-slate-400">{t('rc_expected')}</div>}
        </div>
      ),
    },
    { key: 'paid', title: t('rc_paid'), cellClassName: 'text-right', render: (r) => <Amount value={r.paid} className="text-slate-900" /> },
    {
      key: 'outstanding', title: t('rc_outstanding'), cellClassName: 'text-right',
      render: (r) => <Amount value={r.outstanding} className={r.outstanding > 0 ? 'text-red-700 font-medium' : 'text-slate-400'} />,
    },
    { key: 'status', title: t('rc_status'), cellClassName: 'text-center', render: (r) => <StatusPill status={r.status} t={t} /> },
    { key: 'due', title: t('rc_due_date'), cellClassName: 'text-center text-slate-600', render: (r) => formatDate(r.dueDate) },
    { key: 'paidOn', title: t('rc_paid_date'), cellClassName: 'text-center text-slate-600', render: (r) => formatDate(r.paidDate) },
    { key: 'view', title: t('rc_flat_page'), cellClassName: 'text-center', render: (r) => <ViewFlat flatId={r.flatId} t={t} /> },
  ];

  return (
    <section className="space-y-3">
      {/* The shared table from md up; on a phone nine columns would only scroll sideways, so
          each bill is a card there instead. */}
      <div className="hidden md:block">
        <Table columns={columns} data={rows} rowKey="key" striped hoverable={false} />
      </div>
      <ul className="md:hidden rounded-2xl border border-gray-200 bg-white divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.key} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{r.flatName}</div>
                <div className="text-xs text-slate-500 truncate">{[r.houseName, r.renterName].filter(Boolean).join(' · ')}</div>
              </div>
              <StatusPill status={r.status} t={t} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-slate-500">{t('rc_billed')}</dt><dd><Amount value={r.billed} className="text-sm text-slate-900" /></dd></div>
              <div><dt className="text-slate-500">{t('rc_paid')}</dt><dd><Amount value={r.paid} className="text-sm text-slate-900" /></dd></div>
              <div><dt className="text-slate-500">{t('rc_outstanding')}</dt><dd><Amount value={r.outstanding} className={`text-sm ${r.outstanding > 0 ? 'text-red-700 font-medium' : 'text-slate-400'}`} /></dd></div>
            </dl>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap gap-x-4">
                {r.dueDate && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden />{t('rc_due_date')}: {formatDate(r.dueDate)}</span>}
                {r.paidDate && <span>{t('rc_paid_date')}: {formatDate(r.paidDate)}</span>}
              </div>
              <ViewFlat flatId={r.flatId} t={t} />
            </div>
          </li>
        ))}
      </ul>
      {hasUnbilled && <p className="px-1 text-xs text-slate-500">{t('rc_not_billed_note')}</p>}
    </section>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const RentCollectionPage = () => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const view = params.get('view') === 'year' ? 'year' : 'month';
  const year = Number(params.get('year')) || thisYear;
  const month = Math.min(12, Math.max(1, Number(params.get('month')) || thisMonth));
  const houseId = params.get('house') || '';

  const { data, isFetching, isError } = useGetRentCollectionQuery({ year, month: view === 'month' ? month : undefined, houseId });

  // Latin digits with the app's other figures; month names in the reader's language.
  const locale = i18n.language?.startsWith('bn') ? 'bn-BD-u-nu-latn' : 'en-GB';
  const monthName = (key, style) => {
    const [y, m] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' }).format(new Date(y, m - 1, 1));
  };
  const formatDate = (d) => (d ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T00:00:00`)) : '–');

  const set = (next) => {
    const merged = { view, year, month, house: houseId, ...next };
    const out = { view: merged.view, year: String(merged.year) };
    if (merged.view === 'month') out.month = String(merged.month);
    if (merged.house) out.house = String(merged.house);
    setParams(out);
  };
  const openMonth = (key) => { const [y, m] = key.split('-').map(Number); set({ view: 'month', year: y, month: m }); };

  // Never past the current month or year: there is nothing billed there to look at.
  const atEnd = view === 'month' ? year === thisYear && month === thisMonth : year === thisYear;
  const step = (dir) => {
    if (view === 'year') return set({ year: year + dir });
    const d = new Date(year, month - 1 + dir, 1);
    return set({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthTotals = data?.months?.find((m) => m.month === monthKey);
  // This year: up to this month, plus any later month already billed (the year totals count
  // it, so the chart and table must show it too).
  const nowKey = `${thisYear}-${String(thisMonth).padStart(2, '0')}`;
  const months = (data?.months || []).filter((m) => year < thisYear || m.month <= nowKey || m.billed > 0);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
          <ArrowLeft className="w-4 h-4" aria-hidden /> {t('dashboard')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text">{t('rc_title')}</h1>
        <p className="text-subdued text-sm mt-1">{t('rc_subtitle')}</p>
      </div>

      {/* Every control in one row: what to see, which period, which house. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div role="radiogroup" aria-label={t('rc_title')} className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1">
          {[['month', 'rc_by_month'], ['year', 'rc_by_year']].map(([v, key]) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => set({ view: v })}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${view === v ? 'bg-primary text-white font-medium' : 'text-slate-600 hover:text-slate-900'}`}>
              {t(key)}
            </button>
          ))}
        </div>

        <div className="inline-flex self-start items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1">
          <button type="button" onClick={() => step(-1)} aria-label={t('previous')} className="rounded-lg p-1.5 text-slate-500 hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-28 px-2 text-center text-sm font-medium text-slate-800 whitespace-nowrap">
            {view === 'month' ? monthName(monthKey, 'long') : new Intl.NumberFormat('en', { useGrouping: false }).format(year)}
          </span>
          <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label={t('next')}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {(data?.houses?.length ?? 0) > 1 && (
          <select value={houseId} onChange={(e) => set({ house: e.target.value })} aria-label={t('rc_house')}
            className="sm:ml-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
            <option value="">{t('rc_all_houses')}</option>
            {data.houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t('error_loading_data', 'Could not load the figures.')}</p>
      ) : !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {view === 'month' ? (
            <>
              <Totals totals={monthTotals} t={t} />
              <MonthDetail detail={data.monthDetail} formatDate={formatDate} t={t} />
            </>
          ) : (
            <>
              <Totals totals={data.yearTotals} t={t} />
              <YearChart months={months} monthName={monthName} onOpen={openMonth} t={t} />
              <YearTable months={months} totals={data.yearTotals} monthName={monthName} onOpen={openMonth} t={t} />
              {!houseId && data.byHouse.length > 1 && <HouseTable byHouse={data.byHouse} t={t} />}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RentCollectionPage;

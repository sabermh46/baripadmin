import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMonths, format, parseISO } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { CalendarDays, ChevronRight, Receipt, X, XCircle } from 'lucide-react';
import {
  boundaryFraction,
  buildRows,
  dayKey,
  dayMiddleFraction,
  monthStartsBetween,
  unpaidInvoices,
} from '../../utils/subscriptionTimeline';

/**
 * The owner's subscription on a vertical time axis, newest at the top.
 *
 * Every day from the first payment on is in exactly one block (the server guarantees it:
 * AppFeeStatusService::timelineFromPaidPayments, the same walk the access gate uses), so no
 * day can go missing. A block's height follows how many days it covers, about PX_PER_DAY per
 * day, with a floor so short stretches still have room for their text. The rail on the left
 * marks where each month starts; because blocks can be stretched by their content, those
 * marks are placed from the rendered blocks, at the exact day inside the block that holds it.
 *
 * Reading order, top to bottom:
 *   next      the unpaid invoice that would continue coverage, dashed, on the dates it
 *             would cover, with one quiet line for what happens if it is not paid
 *   (or)      the "if unpaid" forecast as thin rows, when there is no such invoice
 *   today     a line at today's position
 *   current   the period running now: coloured edge, progress, days left
 *   history   past periods, plain; a lapse is a thin "✕ dates ✕" row
 *
 * Each block's dates are its top and bottom edge labels (later on top), and are not repeated
 * in its text. Paid blocks have no fill: the edge colour is enough, and a column of tinted
 * slabs made every period look equally urgent. Only an in-progress grace or pause is tinted,
 * because that is the one state that needs attention.
 *
 * Used by SubscriptionOverview for the owner's page and the admin's per-owner modal.
 * `onPay` (owner only) and `onDetails` are optional; without them those actions are left
 * out. `actionableId` is the invoice the status card above already offers to pay, so its
 * button is not repeated here.
 */
const PX_PER_DAY = 4;
const MIN_HEIGHT = { paid: 92, grace: 76, paused: 64, next: 92 };
const COMPACT_HEIGHT = 34;
const START_MONTHS = 3;
/** Rough height of the vertical "Today · 2 Oct" label, for keeping month labels clear of it. */
const TODAY_LABEL_SPAN = 96;

const EDGE = {
  paid: { current: 'border-emerald-500', past: 'border-slate-200', upcoming: 'border-emerald-300 border-dashed' },
  grace: { current: 'border-amber-400 bg-amber-50/70', past: 'border-amber-200', upcoming: 'border-amber-300 border-dashed' },
  paused: { current: 'border-red-400 bg-red-50/70', past: 'border-red-200', upcoming: 'border-red-300 border-dashed' },
  next: { upcoming: 'border-primary-300 border-dashed' },
};

const DATE_TONE = {
  paid: { current: 'text-emerald-700', past: 'text-slate-400', upcoming: 'text-emerald-600' },
  grace: { current: 'text-amber-700', past: 'text-amber-600', upcoming: 'text-amber-600' },
  paused: { current: 'text-red-700', past: 'text-red-500', upcoming: 'text-red-500' },
  next: { upcoming: 'text-primary-600' },
};

const CHIP = {
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  grace: 'bg-amber-100 text-amber-800',
  paused: 'bg-red-100 text-red-800',
};

const BAR = { paid: 'bg-emerald-500', grace: 'bg-amber-500', paused: 'bg-red-500' };

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

const useDates = () => {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('bn') ? bnLocale : undefined;
  const fmt = (key, pattern) => (key ? format(parseISO(key), pattern, { locale }) : '');
  const range = (start, end) => {
    if (!start || !end) return fmt(start, 'd MMM yyyy');
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    return `${fmt(start, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${fmt(end, 'd MMM yyyy')}`;
  };
  return { fmt, range, locale };
};

const titleOf = (t, s, fmt) => {
  if (s.type === 'paid') return t('tl_paid_title', { amount: money(s.amount) });
  if (s.type === 'grace') return t(`tl_grace_${s.timing}`);
  if (s.timing === 'current') return t('tl_paused_current', { date: fmt(s.start, 'd MMM') });
  if (s.timing === 'upcoming') return t('tl_paused_upcoming', { date: fmt(s.start, 'd MMM yyyy') });
  return t('tl_paused_past');
};

const DetailsLink = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800">
      {t('details')}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
};

const PayButton = ({ inv, onPay }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onPay(inv)}
      className="rounded-md bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-600"
    >
      {inv.metadata?.waiting_for_confirm ? t('update_payment_details') : t('i_have_paid_this')}
    </button>
  );
};

/** Claim state of an unpaid invoice: refused with a reason, or reported and waiting. */
const ClaimNotes = ({ inv }) => {
  const { t } = useTranslation();
  return (
    <>
      {inv.metadata?.claim_rejected && (
        <p className="mt-1 text-[11px] text-red-700">
          <span className="font-semibold">{t('payment_could_not_be_confirmed')}</span>
          {inv.metadata.claim_rejected.reason ? ` — ${inv.metadata.claim_rejected.reason}` : ''}
        </p>
      )}
      {inv.metadata?.waiting_for_confirm && <p className="mt-1 text-[11px] font-medium text-amber-700">{t('reported_as_paid_waiting')}</p>}
    </>
  );
};

/** An unpaid or rejected invoice shown inside another block (not the "next" one). */
const InvoiceLine = ({ inv, onPay, onDetails, actionableId }) => {
  const { t } = useTranslation();
  const { range } = useDates();
  const rejected = inv.kind === 'rejected';
  const Icon = rejected ? XCircle : Receipt;
  const canPay = !rejected && onPay && inv.id !== actionableId;

  // No action of its own here (its pay button is in the status card, or this is an admin's
  // view): one quiet line rather than a card competing with the block it sits in.
  if (!canPay) {
    return (
      <div className={`relative z-[1] mt-2 flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-2 ${rejected ? 'opacity-70' : ''}`}>
        <p className="flex min-w-0 items-start gap-1.5 text-[11px] text-slate-600">
          <Icon className={`mt-px h-3.5 w-3.5 shrink-0 ${rejected ? 'text-slate-400' : 'text-primary-600'}`} />
          {/* Wraps rather than truncating: the dates are the point of the line. */}
          <span>
            {rejected ? t('tl_rejected_title', { amount: money(inv.amount) }) : t('tl_invoice_title', { amount: money(inv.amount) })}
            {' · '}
            {range(inv.rangeStart, inv.rangeEnd)}
          </span>
        </p>
        {onDetails && <DetailsLink onClick={() => onDetails(inv.id)} />}
      </div>
    );
  }

  return (
    <div className="relative z-[1] mt-2 rounded-lg border border-primary-200 bg-white px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Icon className={`h-3.5 w-3.5 ${rejected ? 'text-slate-400' : 'text-primary-600'}`} />
            {rejected ? t('tl_rejected_title', { amount: money(inv.amount) }) : t('tl_invoice_title', { amount: money(inv.amount) })}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{t('tl_invoice_covers', { range: range(inv.rangeStart, inv.rangeEnd) })}</p>
          <ClaimNotes inv={inv} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PayButton inv={inv} onPay={onPay} />
          {onDetails && <DetailsLink onClick={() => onDetails(inv.id)} />}
        </div>
      </div>
    </div>
  );
};

const Block = React.forwardRef(function Block({ row, onDetails, onPay, actionableId }, ref) {
  const { t } = useTranslation();
  const { fmt } = useDates();

  // Thin rows: a past lapse, or the "if unpaid" forecast when there is no next invoice.
  if (row.compact) {
    const tone = row.type === 'grace' ? 'text-amber-700' : 'text-red-600';
    const text = row.forecast
      ? row.type === 'grace'
        ? `${t('tl_grace_upcoming')} · ${fmt(row.start, 'd MMM')} – ${fmt(row.end, 'd MMM')}`
        : t('tl_paused_upcoming', { date: fmt(row.start, 'd MMM yyyy') })
      : `${fmt(row.start, 'd MMM')} – ${fmt(row.end, 'd MMM yyyy')} · ${t('tl_paused_past')} · ${t('tl_days', { count: row.days })}`;
    return (
      <div ref={ref} style={{ minHeight: COMPACT_HEIGHT }} className="relative z-[1] flex flex-col justify-center py-1">
        <p className={`flex items-center gap-1.5 pl-3 text-xs font-medium ${tone}`}>
          {!row.forecast && <X className="h-3.5 w-3.5 shrink-0" />}
          <span>{text}</span>
        </p>
        {row.invoices.map((inv) => (
          <InvoiceLine key={inv.id} inv={inv} onPay={onPay} onDetails={onDetails} actionableId={actionableId} />
        ))}
      </div>
    );
  }

  const state = row.timing;
  const minHeight = Math.max(MIN_HEIGHT[row.type] ?? 64, row.spanDays * PX_PER_DAY);
  const dateTone = DATE_TONE[row.type][state] ?? DATE_TONE[row.type].upcoming;
  const edge = EDGE[row.type][state] ?? EDGE[row.type].upcoming;
  const progress = state === 'current' && row.days && row.dayNumber ? Math.round((row.dayNumber / row.days) * 100) : null;

  return (
    <div ref={ref} style={{ minHeight }} className={`relative z-[1] flex flex-col justify-between rounded-r-lg border-l-[3px] py-1.5 pl-3 pr-2 ${edge}`}>
      {/* The later date on top, the earlier at the bottom: the axis runs newest-first. */}
      <p className={`text-[11px] font-semibold tabular-nums ${dateTone}`}>{fmt(row.end ?? row.spanEnd, 'd MMM')}</p>

      <div className="py-1">
        {row.type === 'next' ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">{t('tl_next')}</p>
                <p className="text-sm font-semibold text-slate-800">{t('tl_invoice_title', { amount: money(row.invoice.amount) })}</p>
                <p className="text-xs text-slate-500">
                  {t('tl_days', { count: row.days })}
                  {row.invoice.house_count ? ` · ${t('active_houses_count', { count: row.invoice.house_count })}` : ''}
                </p>
                <ClaimNotes inv={row.invoice} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {onPay && row.invoice.id !== actionableId && <PayButton inv={row.invoice} onPay={onPay} />}
                {onDetails && <DetailsLink onClick={() => onDetails(row.invoice.id)} />}
              </div>
            </div>
            {(row.ifUnpaid.graceEnd || row.ifUnpaid.pausedFrom) && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                {row.ifUnpaid.graceEnd
                  ? t('tl_if_unpaid', { grace: fmt(row.ifUnpaid.graceEnd, 'd MMM'), paused: fmt(row.ifUnpaid.pausedFrom, 'd MMM') })
                  : t('tl_if_unpaid_no_grace', { paused: fmt(row.ifUnpaid.pausedFrom, 'd MMM') })}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${state === 'past' ? 'text-slate-600' : 'text-slate-800'}`}>{titleOf(t, row, fmt)}</p>
                <p className="text-xs text-slate-500">
                  {row.days ? t('tl_days', { count: row.days }) : t('tl_until_renewed')}
                  {row.type === 'paid' && row.paidDate ? ` · ${t('tl_paid_on', { date: fmt(row.paidDate, 'd MMM yyyy') })}` : ''}
                  {row.type === 'paid' && row.houseCount ? ` · ${t('active_houses_count', { count: row.houseCount })}` : ''}
                </p>
                {row.scheduledStart && (
                  <p className="mt-0.5 text-[11px] text-slate-400">{t('tl_moved_note', { date: fmt(row.scheduledStart, 'd MMM yyyy') })}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {state === 'current' && row.daysLeft != null && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHIP[row.type]}`}>
                    {t('tl_days_left', { count: row.daysLeft })}
                  </span>
                )}
                {row.type === 'paid' && row.paymentId && onDetails && <DetailsLink onClick={() => onDetails(row.paymentId)} />}
              </div>
            </div>
            {progress !== null && (
              <div className="mt-2 h-1 max-w-48 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${BAR[row.type]}`} style={{ width: `${progress}%` }} />
              </div>
            )}
            {row.invoices.map((inv) => (
              <InvoiceLine key={inv.id} inv={inv} onPay={onPay} onDetails={onDetails} actionableId={actionableId} />
            ))}
          </>
        )}
      </div>

      <p className={`text-[11px] font-semibold tabular-nums ${dateTone}`}>{fmt(row.start, 'd MMM')}</p>
    </div>
  );
});

const SubscriptionTimeline = ({ timeline, payments, onDetails, onPay, actionableId }) => {
  const { t } = useTranslation();
  const { fmt, locale } = useDates();
  const today = timeline?.today;

  const rows = useMemo(
    () => (today ? buildRows({ segments: timeline?.segments ?? [], payments, today }) : []),
    [timeline, payments, today]
  );

  // History beyond START_MONTHS is behind "Load previous". Everything from the current block
  // upward is always shown.
  const [monthsBack, setMonthsBack] = useState(START_MONTHS);
  const cutoff = today ? dayKey(addMonths(parseISO(`${today.slice(0, 7)}-01`), -(monthsBack - 1))) : null;
  const visible = rows.filter((r, i) => r.spanEnd >= cutoff || r.timing !== 'past' || i === 0);
  const hiddenCount = rows.length - visible.length;

  // Measured positions of the rendered blocks, for the month rail and the today line.
  const listRef = useRef(null);
  const blockRefs = useRef([]);
  const [layout, setLayout] = useState({ height: 0, marks: [], regions: [], todayY: null });

  useEffect(() => {
    const list = listRef.current;
    if (!list || visible.length === 0) return undefined;

    const measure = () => {
      const boxes = visible.map((row, i) => {
        const el = blockRefs.current[i];
        return { row, top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 };
      });
      const yOf = (key, frac) => {
        const box = boxes.find((b) => key >= b.row.spanStart && key <= b.row.spanEnd);
        return box ? box.top + box.height * frac(box.row, key) : null;
      };

      const newest = visible[0].spanEnd;
      const oldest = visible[visible.length - 1].spanStart;
      const marks = monthStartsBetween(oldest, newest)
        .map((key) => ({ key, y: yOf(key, boundaryFraction) }))
        .filter((m) => m.y !== null);

      // Each month's stretch of the rail: above the newest boundary is that boundary's
      // month; between two boundaries, the lower one's; below the last, the oldest month.
      const height = list.offsetHeight;
      const edges = [0, ...marks.map((m) => m.y), height];
      const months = [...marks.map((m) => m.key), oldest];
      const regions = months.map((key, i) => ({ key, top: edges[i], bottom: edges[i + 1] }));

      setLayout({ height, marks, regions, todayY: yOf(today, dayMiddleFraction) });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
    // `visible` is rebuilt every render; its identity is not the signal, its rows are.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, monthsBack, today]);

  if (!today) return null;

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          {t('tl_title')}
        </h2>
        <p className="text-xs text-slate-500">{t('tl_empty')}</p>
        {unpaidInvoices(payments).map((inv) => (
          <InvoiceLine key={inv.id} inv={{ ...inv, kind: 'unpaid' }} onPay={onPay} onDetails={onDetails} actionableId={actionableId} />
        ))}
      </section>
    );
  }

  const firstDay = rows[rows.length - 1].spanStart;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          {t('tl_title')}
        </h2>
        <p className="text-xs text-slate-500">{t('tl_subtitle')}</p>
      </div>

      <div className="flex gap-1">
        {/* Month rail */}
        <div className="relative w-8 shrink-0" style={{ height: layout.height || undefined }} aria-hidden="true">
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
          {layout.regions.map((r) =>
            layout.todayY !== null && (r.top + r.bottom) / 2 + 48 > layout.todayY - TODAY_LABEL_SPAN && (r.top + r.bottom) / 2 - 48 < layout.todayY + 8 ? null : r.bottom - r.top >= 56 ? (
              <span
                key={`label-${r.key}`}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-180 whitespace-nowrap bg-white py-1 text-[11px] font-medium text-slate-500 [writing-mode:vertical-rl]"
                style={{ top: (r.top + r.bottom) / 2 }}
              >
                {format(parseISO(r.key), 'MMMM yyyy', { locale })}
              </span>
            ) : r.bottom - r.top >= 20 ? (
              <span
                key={`label-${r.key}`}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-[10px] font-medium text-slate-400"
                style={{ top: (r.top + r.bottom) / 2 }}
              >
                {format(parseISO(r.key), 'MMM', { locale })}
              </span>
            ) : null
          )}
          {layout.todayY !== null && (
            <>
              <span
                className="absolute left-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500 ring-2 ring-white"
                style={{ top: layout.todayY }}
              />
              <span
                className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-full rotate-180 whitespace-nowrap bg-white py-1 text-[11px] font-semibold text-primary-600 [writing-mode:vertical-rl]"
                style={{ top: layout.todayY - 8 }}
              >
                {t('tl_today')} · {fmt(today, 'd MMM')}
              </span>
            </>
          )}
          {layout.marks.map((m) => (
            <span
              key={`mark-${m.key}`}
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-300"
              style={{ top: m.y }}
            />
          ))}
        </div>

        {/* Blocks */}
        <div ref={listRef} className="relative min-w-0 flex-1 space-y-1.5">
          {visible.map((row, i) => (
            <Block
              key={row.key}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
              row={row}
              onDetails={onDetails}
              onPay={onPay}
              actionableId={actionableId}
            />
          ))}

          {/* Behind the blocks (they come later in the stacking order and their content is
              raised), so the line never runs over text or covers a button. The label lives on
              the rail instead. */}
          {layout.todayY !== null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-0 h-px bg-primary-400/80"
              style={{ top: layout.todayY }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setMonthsBack((m) => m + START_MONTHS)}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {t('tl_load_previous')}
          </button>
        ) : (
          <p className="text-[11px] text-slate-400">{t('tl_started_on', { date: fmt(firstDay, 'd MMMM yyyy') })}</p>
        )}
      </div>
    </section>
  );
};

export default SubscriptionTimeline;

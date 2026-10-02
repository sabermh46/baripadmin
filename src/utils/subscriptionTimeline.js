import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/**
 * Turns the server's subscription timeline into the rows the app-fee page draws.
 *
 * The server owns the day maths (AppFeeStatusService::timelineFromPaidPayments): which days
 * were paid, which were grace, which were paused, worked out by the same walk the access
 * gate uses. Nothing here recomputes coverage. This lays the segments out newest first, gives
 * each one the span of days it occupies on the page's time axis, and attaches the one thing the
 * server timeline leaves out on purpose: unpaid invoices, which change nothing until paid.
 *
 * Dates are 'yyyy-MM-dd' strings, which sort correctly as text, parsed with parseISO so a
 * date-only value means local midnight rather than UTC midnight.
 */

export const dayKey = (date) => format(date, 'yyyy-MM-dd');

/** An invoice's own period, last day included (its stated dates, before any stacking). */
const withRange = (p) => {
  const days = Number(p.subscription_days) || 30;
  return { ...p, rangeStart: p.start_date, rangeEnd: dayKey(addDays(parseISO(p.start_date), days - 1)) };
};

/** Unpaid invoices that would cover days if paid: pending or overdue, with a start date. */
export const unpaidInvoices = (payments = []) =>
  payments.filter((p) => (p.status === 'pending' || p.status === 'overdue') && p.start_date).map(withRange);

const rejectedInvoices = (payments = []) =>
  payments.filter((p) => p.status === 'rejected' && p.start_date).map(withRange);

const spanDaysOf = (start, end) => differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;

/**
 * One row per segment, newest first.
 *
 * `spanStart`..`spanEnd` is the stretch of the time axis a row occupies. It is the segment's
 * own dates, except for the open-ended "paused" segment, which has no end: if it is today's
 * state it runs to today; if it is still in the future it is a one-day cap on top.
 *
 * `compact` rows are past paused stretches, drawn as a thin "✕ 30 Aug – 5 Sep ✕" separator
 * rather than a block: what happened is fully stated, without a lapse dominating the page.
 *
 * Unpaid (and rejected) invoices are attached to the row whose days their period starts in,
 * so "I have paid this" sits next to the days it would cover. One that starts after
 * everything on the axis joins the top row.
 */
export const buildRows = ({ segments = [], payments = [], today }) => {
  let rows = segments
    .map((s) => {
      const spanEnd = s.end ?? (s.timing === 'current' ? today : s.start);
      const forecast = s.timing === 'upcoming' && s.type !== 'paid';
      return {
        ...s,
        key: `${s.type}-${s.start}`,
        spanStart: s.start,
        spanEnd,
        spanDays: Math.max(1, spanDaysOf(s.start, spanEnd)),
        openEnded: s.end === null,
        // Thin one-line rows: a past lapse, and the "if nothing is paid" forecast. Neither is
        // the state the owner is in, so neither should take the space of one that is.
        compact: (s.type === 'paused' && s.end !== null) || forecast,
        forecast,
        invoices: [],
      };
    })
    .reverse();

  /**
   * "Next": an unpaid invoice that would continue the coverage.
   *
   * Without it the top of the page was a red "access pauses on 4 Nov" for an owner with 28
   * days left, which is only what happens if they do NOT pay. The likely future is the
   * invoice: the next period, on the dates it would cover. So when an unpaid invoice starts on
   * the day the forecast begins, it becomes the top block, and the forecast is folded into
   * one quiet "if unpaid" line inside it.
   */
  const unpaid = unpaidInvoices(payments);
  const forecastRows = rows.filter((r) => r.forecast);
  const firstForecast = forecastRows[forecastRows.length - 1];
  const next = firstForecast && unpaid.find((inv) => inv.rangeStart === firstForecast.spanStart);

  if (next) {
    rows = [
      {
        key: `next-${next.id}`,
        type: 'next',
        timing: 'upcoming',
        start: next.rangeStart,
        end: next.rangeEnd,
        days: spanDaysOf(next.rangeStart, next.rangeEnd),
        spanStart: next.rangeStart,
        spanEnd: next.rangeEnd,
        spanDays: spanDaysOf(next.rangeStart, next.rangeEnd),
        invoice: next,
        ifUnpaid: {
          graceEnd: forecastRows.find((r) => r.type === 'grace')?.end ?? null,
          pausedFrom: forecastRows.find((r) => r.type === 'paused')?.start ?? null,
        },
        invoices: [],
      },
      ...rows.filter((r) => !r.forecast),
    ];
  }

  const attach = (inv, kind) => {
    const row = rows.find((r) => inv.rangeStart >= r.spanStart && inv.rangeStart <= r.spanEnd)
      ?? (rows.length && inv.rangeStart > rows[0].spanEnd ? rows[0] : rows[rows.length - 1]);
    if (row) row.invoices.push({ ...inv, kind });
  };
  unpaid.filter((inv) => inv.id !== next?.id).forEach((inv) => attach(inv, 'unpaid'));
  rejectedInvoices(payments).forEach((inv) => attach(inv, 'rejected'));

  return rows;
};

/**
 * Where a day boundary (00:00 on `key`) falls inside a row, as a fraction from the row's TOP.
 * Rows are newest-at-top, so later dates sit higher: the row's top edge is the end of its
 * last day, its bottom edge the start of its first.
 */
export const boundaryFraction = (row, key) => {
  const fromTop = differenceInCalendarDays(addDays(parseISO(row.spanEnd), 1), parseISO(key));
  return Math.min(1, Math.max(0, fromTop / row.spanDays));
};

/** The middle of a day (for the "today" line), as a fraction from the row's top. */
export const dayMiddleFraction = (row, key) =>
  Math.min(1, Math.max(0, (differenceInCalendarDays(parseISO(row.spanEnd), parseISO(key)) + 0.5) / row.spanDays));

/** First-of-month keys strictly after `fromKey` and up to `toKey`, newest first. */
export const monthStartsBetween = (fromKey, toKey) => {
  const out = [];
  let d = parseISO(`${fromKey.slice(0, 7)}-01`);
  const end = parseISO(toKey);
  while (d <= end) {
    const key = dayKey(d);
    if (key > fromKey) out.push(key);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out.reverse();
};

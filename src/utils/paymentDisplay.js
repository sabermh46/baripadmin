/**
 * Shared formatting for the dashboard's payment cards.
 *
 * Upcoming and Overdue render the same kind of row and were drifting apart: one used
 * `TkSymbol`, the other a literal ৳; one translated its badge, the other interpolated
 * English; both pinned dates to `en-US`. Keeping these here is what stops the two cards
 * disagreeing about how the same figure is written.
 */

/**
 * Latin digits with 123,000-style grouping, matching every other figure in the app.
 *
 * `bn-BD` would render ১,২৩,০০০ — Bengali numerals *and* lakh grouping — which is neither
 * what the rest of the interface does nor what the screens already show. Bengali numerals
 * have caused a real problem here once before, in the PDF path.
 */
export const money = (value) => Number(value ?? 0).toLocaleString('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Bengali month names with Latin digits, so a date follows the interface language without
 * switching numerals mid-sentence. `bn-BD` alone gives "৪ সেপ, ২০২৬"; the `-u-nu-latn`
 * extension keeps the digits Latin and yields "4 সেপ".
 */
export const dateLocaleFor = (language) =>
  (language?.startsWith('bn') ? 'bn-BD-u-nu-latn' : 'en-US');

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatShortDate = (value, locale) => {
  const date = safeDate(value);
  return date ? date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—';
};

/**
 * `for_month` is a 'YYYY-MM' string. Parsed as a local date on the first of the month rather
 * than handed to `new Date('2026-08')`, which JavaScript reads as UTC midnight and can render
 * as the previous month for anyone east of Greenwich — Dhaka included.
 */
export const formatMonth = (value, locale) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
};

/**
 * How much of an invoice has actually been collected.
 *
 * `amount` is what is still owed; the gross and the part already settled travel alongside it
 * and were being discarded by both cards, so a half-collected invoice was indistinguishable
 * from an untouched one.
 *
 * Guarded rather than assumed: `useOfflineFallback` can serve a cached payload from before
 * these keys existed, and such a row must render no bar instead of dividing by zero.
 */
export const partialOf = (payment) => {
  const paid = Number(payment?.paid_amount ?? 0);
  const invoice = Number(payment?.invoice_amount ?? 0);
  const isPartial = paid > 0 && invoice > paid;

  return {
    paid,
    invoice,
    isPartial,
    percent: isPartial ? Math.min(100, Math.round((paid / invoice) * 100)) : 0,
  };
};

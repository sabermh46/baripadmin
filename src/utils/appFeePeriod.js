import { format } from 'date-fns';

/**
 * The stretch of time an app-fee invoice buys, as something a person can read.
 *
 * This replaces the raw database id that used to identify invoices on screen. Owner 6's
 * history read "#2, #21, #23" — the gaps announced that twenty other invoices existed
 * belonging to other customers, which is the platform's monthly volume visible to every
 * customer who looks; and inside their own history the jumps read as records gone missing.
 *
 * Naming the month instead is the obvious replacement and does not survive real data: an
 * invoice starting 1 Aug and another starting 31 Aug are both "August", and this owner has
 * exactly that pair. So the coverage span is used — which is the thing that actually
 * distinguishes one invoice from the next, and the thing an owner is really asking about
 * when they look for "the one I paid in August".
 *
 * Periods are half-open: start + subscription_days is the first uncovered day, so the last
 * covered day is the one before it.
 */

const DEFAULT_DAYS = 30;

const parse = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// date-fns, not toLocaleDateString, because every other date in this app goes through it and
// the two disagree: Intl under en-GB abbreviates September as "Sept", so a period would read
// "30 Sept – 29 Oct" directly beneath a "Valid through 29 Sep 2026" written by date-fns.
const fmt = (d, withYear) => format(d, withYear ? 'd MMM yyyy' : 'd MMM');

/**
 * @returns {string|null} e.g. "30 Sep – 29 Oct 2026", or "30 Dec 2026 – 28 Jan 2027" when the
 *   period straddles a year boundary. null when the row has no usable start date, so callers
 *   can fall back rather than print "Invalid Date".
 */
export const invoicePeriod = (payment) => {
  const start = parse(payment?.start_date);
  if (!start) return null;

  const days = Number(payment?.subscription_days) || DEFAULT_DAYS;
  const lastCovered = new Date(start);
  lastCovered.setDate(lastCovered.getDate() + days - 1);

  const sameYear = start.getFullYear() === lastCovered.getFullYear();

  return `${fmt(start, !sameYear)} – ${fmt(lastCovered, true)}`;
};

export default invoicePeriod;

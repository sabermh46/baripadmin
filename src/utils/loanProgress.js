import { differenceInCalendarDays } from 'date-fns';

/**
 * How far through the money a loan is, and how far through its time.
 *
 * The interesting figure is the relationship between the two, which is why this is worth
 * computing rather than printing: a loan 30% repaid at the 80% mark of its term is behind,
 * and the table this replaced showed amount, paid and start date as three unrelated numbers
 * and left the arithmetic to whoever was reading.
 *
 * `end_date` and `monthly_payment` are both nullable on the model, so every derived figure
 * here has to survive their absence rather than produce NaN. A loan with no end date has no
 * term to be measured against, so it gets no pace judgement at all — an honest null beats
 * inventing a deadline.
 *
 * Pure, and separate from the card, so the thresholds can be tested without rendering.
 *
 * @param {object} loan  a row from /api/loans/loan-by-house/{id}
 * @param {Date}   [now] injected so tests do not depend on the clock
 */
export const loanProgress = (loan, now = new Date()) => {
  const amount = Number(loan?.amount) || 0;
  const paid = Number(loan?.paid_amount) || 0;
  const remaining = Math.max(0, amount - paid);
  const paidPct = amount > 0 ? Math.min(100, (paid / amount) * 100) : 0;

  const start = loan?.start_date ? new Date(loan.start_date) : null;
  const end = loan?.end_date ? new Date(loan.end_date) : null;

  let timePct = null;
  let daysLeft = null;
  if (start && end && end > start) {
    const total = differenceInCalendarDays(end, start);
    const elapsed = differenceInCalendarDays(now, start);
    timePct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    daysLeft = differenceInCalendarDays(end, now);
  }

  const settled = loan?.status === 'paid' || (amount > 0 && remaining === 0);

  // A 5-point band rather than a strict comparison, so a loan a day or two out of step is
  // not called late — repayment moves in lumps and time moves continuously, so the two
  // percentages are never going to track each other exactly.
  let pace = null;
  // `amount > 0` guards bad data: a zero-amount loan has 0% repaid against a term that is
  // running, which scored as "behind schedule" — a judgement about repayment on a loan with
  // nothing to repay. No amount means no pace to be in.
  if (!settled && amount > 0 && timePct !== null) {
    if (paidPct >= timePct - 5) pace = 'on_track';
    else if (paidPct >= timePct - 20) pace = 'slightly_behind';
    else pace = 'behind';
  }

  return { amount, paid, remaining, paidPct, timePct, daysLeft, settled, pace };
};

export default loanProgress;

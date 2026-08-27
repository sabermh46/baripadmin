/**
 * The life of one app-fee invoice, as an ordered list of things that happened to it.
 *
 * Everything here is already in the payload — it is just scattered across three places that
 * nobody would think to correlate by eye: top-level columns (`start_date`, `paid_date`,
 * `verified_at`), the `metadata` bag written by the claim/verify flow (`claim`,
 * `claim_rejected`, `claim_confirmed`, `closed`), and `subscription_days`, which is the only
 * thing that says when the invoice stops covering anything.
 *
 * The question this answers is the one an admin actually asks in front of a disputed invoice:
 * *when did the owner say they paid, what reference did they give, who checked it, and what
 * did they decide* — which previously required opening the edit form and reading raw JSON.
 *
 * Pure: no React, no i18next. It returns label KEYS and interpolation values, so the caller
 * translates. That keeps the ordering logic testable without a running i18n instance.
 */

const parse = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sameDay = (a, b) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * @param {object} payment  a row from /app-fees/payments (list or show)
 * @param {Date}   [now]    injected so tests are not at the mercy of the clock
 * @returns {Array<{
 *   key: string, at: Date|null, titleKey: string, values: object,
 *   detail: string|null, state: 'done'|'current'|'upcoming'|'failed'
 * }>}
 */
export const buildAppFeeTimeline = (payment, now = new Date()) => {
  if (!payment) return [];

  const meta = payment.metadata ?? {};
  const claim = meta.claim ?? meta.claim_confirmed ?? null;
  const rejected = meta.claim_rejected ?? null;

  const events = [];
  const push = (e) => events.push({ detail: null, values: {}, ...e });

  // 1. Somebody raised it. metadata.createdAt is written by the controller at the same moment
  //    as the row, so the two agree; created_at is the fallback for rows predating it.
  const raisedAt = parse(meta.createdAt) ?? parse(payment.created_at);
  push({
    key: 'raised',
    at: raisedAt,
    titleKey: 'invoice_raised',
    detail: meta.createdBy?.name ?? null,
    state: 'done',
  });

  // 2. The period it buys. Both ends are derived from start_date, because there is no end
  //    column — subscription_days is the whole definition of the window.
  const start = parse(payment.start_date);
  if (start) {
    push({
      key: 'coverage_start',
      at: start,
      titleKey: 'coverage_begins',
      state: start > now ? 'upcoming' : 'done',
    });
  }

  // 3. The owner (or their caretaker) says the money has been sent. This is a claim, not a
  //    settlement — the reference is what an admin matches against a bKash/bank statement.
  const claimedAt = parse(claim?.at);
  if (claimedAt) {
    push({
      key: 'claimed',
      at: claimedAt,
      titleKey: 'owner_reported_payment',
      detail: claim?.byName ?? null,
      values: { method: claim?.method ?? null, reference: claim?.transactionId ?? null, amount: claim?.amount ?? null },
      state: 'done',
    });
  }

  // 4. Refused, with the reason the owner was given. Without this the invoice just reverted to
  //    unpaid and an accepted claim looked identical to a refused one.
  const rejectedAt = parse(rejected?.at);
  if (rejectedAt) {
    push({
      key: 'rejected',
      at: rejectedAt,
      titleKey: 'claim_sent_back',
      detail: rejected?.byName ?? null,
      values: { reason: rejected?.reason ?? null },
      state: 'failed',
    });
  }

  // 5. Confirmed, and the day the money is recorded against. These are usually the same click
  //    but need not be: an owner can pay on the 3rd and be verified on the 5th, and paid_date
  //    is the one that decides what the subscription covers. Merged when they land on the same
  //    day, which is the common case, so the timeline does not show one action twice.
  const verifiedAt = parse(payment.verified_at) ?? parse(meta.claim_confirmed?.confirmedAt);
  const paidDate = parse(payment.paid_date);

  if (verifiedAt) {
    push({
      key: 'confirmed',
      at: verifiedAt,
      titleKey: 'payment_confirmed',
      detail: payment.verifier_name ?? null,
      state: 'done',
    });
  }
  if (paidDate && !sameDay(paidDate, verifiedAt)) {
    push({ key: 'received', at: paidDate, titleKey: 'money_received', state: 'done' });
  }

  // 6. Claimed and nobody has looked yet. Undated on purpose — it is a state, not an event,
  //    and giving it a date would put a thing that has not happened into the chronology.
  if (meta.waiting_for_confirm && !verifiedAt) {
    push({ key: 'awaiting', at: null, sortAt: now, titleKey: 'awaiting_admin_verification', state: 'current' });
  }

  // 7. The far end of the window. Half-open like invoicePeriod(): start + days is the first
  //    uncovered day, so the last covered day is the one before it.
  if (start) {
    const days = Number(payment.subscription_days) || 30;
    const lastCovered = new Date(start);
    lastCovered.setDate(lastCovered.getDate() + days - 1);
    push({
      key: 'coverage_end',
      at: lastCovered,
      titleKey: 'coverage_ends',
      state: lastCovered > now ? 'upcoming' : 'done',
    });
  }

  // Chronological. The undated "waiting" node sorts by `sortAt` (now) so it sits between what
  // has already happened and what has not — sorting undated entries to either end would put
  // "waiting for verification" before the invoice existed, or after the period it covers.
  return events.sort((a, b) => (a.sortAt ?? a.at) - (b.sortAt ?? b.at));
};

export default buildAppFeeTimeline;

import { format } from 'date-fns';

/**
 * Where a billed month sits relative to the month we are in now.
 *
 * Colour on the rent screens used to key off "is anything owed", which painted every unpaid
 * figure red. But an unpaid bill for October, read in August, is not a problem — it is next
 * month's rent, not yet due. Showing it in the same red as a bill two months late tells the
 * landlord to chase a tenant who owes nothing yet, and it dilutes the red that does matter.
 *
 * 'past' → genuinely late  ·  'current' → due this month  ·  'future' → not due yet
 */
export const monthRelativity = (forMonth) => {
  if (!forMonth) return 'current';

  const [y, m] = String(forMonth).split('-').map(Number);
  if (!y || !m) return 'current';

  const now = new Date();
  const billed = y * 12 + (m - 1);
  const current = now.getFullYear() * 12 + now.getMonth();

  if (billed < current) return 'past';
  if (billed > current) return 'future';
  return 'current';
};

/** "2026-09" → "September" (or "Sep" when short). */
export const monthName = (forMonth, short = false) => {
  if (!forMonth) return null;
  const [y, m] = String(forMonth).split('-').map(Number);
  if (!y || !m) return forMonth;
  return format(new Date(y, m - 1, 1), short ? 'MMM' : 'MMMM');
};

/** "2026-09" → "September 2026". */
export const monthNameYear = (forMonth) => {
  if (!forMonth) return null;
  const [y, m] = String(forMonth).split('-').map(Number);
  if (!y || !m) return forMonth;
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
};

/** Text colour for an amount owed, by how urgent that month actually is. */
export const DUE_TEXT_TONE = {
  past: 'text-red-600',
  current: 'text-amber-700',
  future: 'text-gray-600',
};

/** Badge colours for a rent state, once the month has had its say. */
export const dueBadgeTone = (relativity) => ({
  past: 'bg-red-100 text-red-800',
  current: 'bg-amber-100 text-amber-800',
  future: 'bg-gray-100 text-gray-700',
}[relativity] ?? 'bg-gray-100 text-gray-600');

/**
 * Human wording for an advance payment's status.
 *
 * `partially_used` is a database enum, not a sentence, and shown raw it was the one piece of
 * machine vocabulary left on an otherwise finished screen. "paid" is also misleading for an
 * advance - it means the money is in hand and untouched - so it reads as "Available".
 *
 * Its own module rather than living beside a component: exporting a helper from a .jsx file
 * breaks React Fast Refresh, which only works when a component file exports components.
 */
export const advanceStatusLabel = (t, status) =>
  t(`advance_status_${status}`, String(status ?? '-').replace(/_/g, ' '));

export const advanceStatusToneClass = (status) => {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'partially_used') return 'bg-amber-100 text-amber-800';
  if (status === 'fully_used') return 'bg-slate-200 text-slate-700';
  if (status === 'refunded') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

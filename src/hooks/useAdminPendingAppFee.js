import { useAuth } from '.';
import { useGetAppFeeStatusQuery } from '../store/api/appFeeApi';

/**
 * The signed-in house owner's (or caretaker's) live subscription state.
 *
 * Reads it from the backend rather than re-deriving it. Previously three different places
 * each computed their own expiry date from raw payment rows, and no two agreed:
 *
 *   - this hook:               start_date + subscription_days            (pending invoices)
 *   - Layout.jsx:              start_date + subscription_days + offset_days
 *   - CustomersAppFeePage.jsx: start_date + subscription_days            (labelled "Due")
 *   - the server, which is what actually blocks: paid_date + subscription_days, then +offset
 *
 * So the date shown to an owner had no reliable relationship to the day they were really cut
 * off. There is now one implementation — AppFeeStatusService — and every screen renders what
 * the gate itself enforces.
 *
 * The old hook also looked only at *pending* invoices whose metadata said an admin created
 * them, and only warned once `warningDate < today`, i.e. after the fact. Coverage comes from
 * *paid* invoices, so that could never describe the real subscription state.
 */
export const useAdminPendingAppFee = () => {
  const { user, isHouseOwner, isCaretaker } = useAuth();
  const enabled = !!user?.id && (isHouseOwner || isCaretaker);

  const { data, isLoading, isFetching, error } = useGetAppFeeStatusQuery(user?.id, {
    skip: !enabled,
  });

  const status = enabled ? (data ?? null) : null;

  // Warn through the last week of the subscription and for the whole grace period.
  // `hasEverPaid` gates it so a freshly-invited owner who has not been invoiced yet is not
  // shown an alarming banner about an expiry that never existed.
  const showWarning =
    !!status &&
    status.hasEverPaid &&
    (status.inGracePeriod || status.isBlocked || (status.isActive && status.daysRemaining <= 7));

  return {
    status,
    showWarning,
    isBlocked: !!status?.isBlocked,
    inGracePeriod: !!status?.inGracePeriod,
    daysRemaining: status?.daysRemaining ?? 0,
    graceDaysRemaining: status?.graceDaysRemaining ?? 0,
    // The moment access is actually withdrawn — the same one the middleware uses.
    loseAccessAt: status?.blockAfter ?? null,
    validThrough: status?.validThrough ?? null,
    isLoading: isLoading || isFetching,
    error,
  };
};

export default useAdminPendingAppFee;

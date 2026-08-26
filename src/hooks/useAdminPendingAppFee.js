import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '.';
import { useGetMyAppFeeQuery } from '../store/api/appFeeApi';
import { setSubscriptionBlocked } from '../store/slices/uiSlice';

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

  // GET /app-fees/me, not /payments/status/{id}.
  //
  // This hook passed `user.id` as the house-owner id, which is right for an owner and wrong
  // for a caretaker — a caretaker's own id is not a house_owner id, so assertViewAccess
  // refused it and the query 403'd. `status` stayed null, `showWarning` stayed false, and
  // the banner never appeared for a caretaker even once their owner was fully blocked. The
  // /me endpoint exists precisely to resolve the owner server-side; it was added for the
  // app-fee page and this hook was never moved across.
  const { data, isLoading, isFetching, error } = useGetMyAppFeeQuery(undefined, {
    skip: !enabled,
    // The banner and the paywall both read this, so it has to notice a payment landing
    // without waiting for a navigation.
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  const status = enabled ? (data?.status ?? null) : null;

  // /app-fees/me is on the gate's allow-list, so it answers even while everything else is
  // being refused — which makes it the one reliable place to learn that a payment has
  // landed and the block is over. Without this the flag, once raised, would only clear on a
  // reload.
  const dispatch = useDispatch();
  useEffect(() => {
    if (!enabled || !status) return;
    dispatch(setSubscriptionBlocked(!!status.isBlocked && !!status.hasEverPaid));
  }, [dispatch, enabled, status]);

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

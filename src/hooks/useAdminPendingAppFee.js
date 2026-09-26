import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth, useAppSelector } from '.';
import { useGetMyAppFeeStatusQuery } from '../store/api/appFeeApi';
import { setSubscriptionBlocked } from '../store/slices/uiSlice';

const DAY_MS = 86_400_000;

/**
 * The longest the hook trusts one answer. Everything that changes the status by the clock is
 * scheduled exactly (see nextCheckAt), and everything done by a person sends an app-fee
 * notification — except an admin quietly editing or deleting a paid invoice. Once a day
 * covers that for a PWA left open for days, at one request a day instead of one a minute.
 */
const BACKSTOP_MS = DAY_MS;

/** A due refetch that failed (offline, server down) is retried this often until it lands. */
const RETRY_MS = 5 * 60 * 1000;

/** setTimeout overflows past ~24.8 days and fires immediately; clamp below it. */
const MAX_TIMEOUT_MS = 2_147_483_647;

const toMs = (iso) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

// AppFeeStatusService counts days from the server's startOfDay(), and the server runs in
// UTC — so these do too. Counting from local midnight would disagree with the server for
// six hours of every Dhaka day.
const utcDayStart = (ms) => ms - (((ms % DAY_MS) + DAY_MS) % DAY_MS);
const wholeDaysUntil = (targetMs, now) => Math.max(0, Math.floor((targetMs - utcDayStart(now)) / DAY_MS));

/**
 * The server's answer, aged to `now`.
 *
 * Between its boundaries the status changes only in its day counters, and those are pure
 * arithmetic on timestamps the server already gave us: `expiresAt` and `blockAfter` are the
 * very instants AppFeeStatusService diffs against. Recounting them locally keeps "renews in
 * 5 days" true tomorrow without asking again. This is not the old client-side derivation
 * the note below warns about. That rebuilt the dates themselves from raw payment rows.
 */
const ageStatus = (status, now) => {
  if (!status) return null;

  const expiresAt = toMs(status.expiresAt);
  const blockAfter = toMs(status.blockAfter);

  if (status.isActive && expiresAt != null) {
    return { ...status, daysRemaining: wholeDaysUntil(expiresAt, now) };
  }
  if (status.inGracePeriod && blockAfter != null) {
    return {
      ...status,
      graceDaysRemaining: wholeDaysUntil(blockAfter, now),
      daysSinceExpiry: expiresAt != null ? Math.floor((now - expiresAt) / DAY_MS) : status.daysSinceExpiry,
    };
  }
  if (status.isBlocked && status.hasEverPaid && expiresAt != null) {
    return { ...status, daysSinceExpiry: Math.floor((now - expiresAt) / DAY_MS) };
  }

  return status;
};

/**
 * When this answer stops being predictable, i.e. the next instant the server would say
 * something that aging cannot produce:
 *
 *   active → grace    at expiresAt
 *   grace  → blocked  at blockAfter
 *
 * Blocked, never-paid and pre-paid-future states have no clock boundary the response
 * exposes. They change only when someone pays or an admin acts, and those send
 * notifications. The backstop caps all of them.
 */
const nextCheckAt = (status, fetchedAt) => {
  let at = fetchedAt + BACKSTOP_MS;

  const expiresAt = toMs(status.expiresAt);
  const blockAfter = toMs(status.blockAfter);
  if (status.isActive && expiresAt != null) at = Math.min(at, expiresAt);
  if (status.inGracePeriod && blockAfter != null) at = Math.min(at, blockAfter);

  return at;
};

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
 *
 * WHEN IT ASKS THE SERVER
 * -----------------------
 * This hook is mounted by Layout, so it runs on every page for every owner and caretaker.
 * It used to poll every 10 minutes and refetch on every reconnect, even though one answer
 * already says when it will next change. Now it asks:
 *
 *   1. once on load;
 *   2. when the answer runs out: at expiresAt / blockAfter, or after BACKSTOP_MS
 *      (nextCheckAt). A tab that slept through that moment catches up when it is shown again;
 *   3. the moment an app-fee notification arrives:
 *        - by push: `entity: 'app_fee'` invalidates the AppFeePayments tag (App.jsx), which
 *          this query provides;
 *        - without push: the unread-count poll reports the latest app-fee notice's
 *          time (ui.appFeeNoticeAt), and a notice newer than our answer triggers a refetch.
 *
 * Between those points the day counters are aged locally (ageStatus), so the banner still
 * counts down correctly without a request.
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
  const { data, fulfilledTimeStamp, refetch, isLoading, isFetching, error } = useGetMyAppFeeStatusQuery(undefined, {
    skip: !enabled,
    // The schedule below decides. These must be set here, on the subscription: RTK
    // Query ignores them on an endpoint definition. baseApi turns reconnect on globally,
    // and a notice missed while offline still arrives, because the unread count
    // refetches on reconnect and carries appFeeAt.
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const rawStatus = enabled ? (data?.status ?? null) : null;

  // Re-read on each timer wake and when the tab is shown, so ageStatus has a fresh clock.
  const [now, setNow] = useState(() => Date.now());

  const dueAt = useMemo(
    () => (rawStatus && fulfilledTimeStamp ? nextCheckAt(rawStatus, fulfilledTimeStamp) : null),
    [rawStatus, fulfilledTimeStamp]
  );

  // One timer. It wakes at the next UTC midnight (so the counters roll over on screen) or
  // at dueAt, whichever comes first. Only dueAt costs a request.
  useEffect(() => {
    if (!enabled || dueAt == null) return undefined;

    let timer = null;

    const check = () => {
      clearTimeout(timer);
      const t = Date.now();
      setNow(t);

      if (t >= dueAt) {
        refetch();
        // A successful refetch moves fulfilledTimeStamp, which re-runs this effect and
        // clears this timer. It only fires if the request failed.
        timer = setTimeout(check, RETRY_MS);
        return;
      }

      const wakeAt = Math.min(dueAt, utcDayStart(t) + DAY_MS);
      timer = setTimeout(check, Math.min(Math.max(wakeAt - t, 0), MAX_TIMEOUT_MS));
    };

    // Background tabs have their timers throttled or frozen, so a boundary can pass unseen.
    // Being shown again is when the owner will look, so catch up then. This check is
    // local; it only makes a request if dueAt has actually passed.
    const onVisible = () => {
      if (!document.hidden) check();
    };

    check();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, dueAt, refetch]);

  // Fallback for users without push. Keyed on the notice time alone, and compared with our
  // last answer through a ref: when a push already refreshed the status, the unread count
  // that follows reports a notice older than that answer and nothing happens. Depending on
  // fulfilledTimeStamp here would instead loop for as long as the client clock runs behind
  // the server's.
  const noticeAt = useAppSelector((state) => state.ui.appFeeNoticeAt);
  const fulfilledRef = useRef(fulfilledTimeStamp);
  // Declared before the effect that reads it, so it runs first in the same commit.
  useEffect(() => {
    fulfilledRef.current = fulfilledTimeStamp;
  }, [fulfilledTimeStamp]);

  useEffect(() => {
    if (!enabled) return;
    const at = toMs(noticeAt);
    const answeredAt = fulfilledRef.current;
    // No answer yet means the first request is still in flight, and it will include this notice.
    if (at == null || !answeredAt || at <= answeredAt) return;
    refetch();
  }, [enabled, noticeAt, refetch]);

  const status = useMemo(() => ageStatus(rawStatus, now), [rawStatus, now]);

  // /app-fees/me is on the gate's allow-list, so it answers even while everything else is
  // being refused — which makes it the one reliable place to learn that a payment has
  // landed and the block is over. Without this the flag, once raised, would only clear on a
  // reload.
  const dispatch = useDispatch();
  useEffect(() => {
    if (!enabled || !rawStatus) return;
    dispatch(setSubscriptionBlocked(!!rawStatus.isBlocked && !!rawStatus.hasEverPaid));
  }, [dispatch, enabled, rawStatus]);

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
    // Identifies the subscription period, so a dismissal can be scoped to it.
    expiresAt: status?.expiresAt ?? null,
    isLoading: isLoading || isFetching,
    error,
  };
};

export default useAdminPendingAppFee;

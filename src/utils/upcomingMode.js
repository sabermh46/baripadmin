/**
 * Which of the two "upcoming payments" definitions the owner prefers on their dashboard.
 *
 * Kept in localStorage rather than on the user record: it is a view preference for one
 * person on one device, it changes nothing the server computes (the dashboard returns both
 * lists), and putting it behind an API call would make a toggle wait on the network.
 *
 * Every read is guarded — localStorage throws in Safari private mode and is absent when the
 * app is rendered anywhere without a DOM, and a dashboard should not fail to render because
 * a preference could not be read.
 */
export const UPCOMING_MODES = {
  /** Unsettled and due within the next 30 days — a rolling window on the due date. */
  DAYS: 'days',
  /** Everything unsettled for the current month, whatever its due date. */
  MONTH: 'month',
};

const KEY = 'barip:dashboard:upcomingMode';

export const readUpcomingMode = () => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === UPCOMING_MODES.MONTH ? UPCOMING_MODES.MONTH : UPCOMING_MODES.DAYS;
  } catch {
    return UPCOMING_MODES.DAYS;
  }
};

export const writeUpcomingMode = (mode) => {
  try {
    window.localStorage.setItem(KEY, mode === UPCOMING_MODES.MONTH ? UPCOMING_MODES.MONTH : UPCOMING_MODES.DAYS);
  } catch {
    // A preference that cannot be remembered is not a reason to break the click.
  }
};

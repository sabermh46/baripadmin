/**
 * Which cached data a push notification invalidates.
 *
 * THE PROBLEM
 * -----------
 * A notification and the data it is about travel separately. Staff adds a house; the owner's
 * phone buzzes; the owner opens Houses and sees the list as it was, because baseApi keeps
 * query data for 600s and `refetchOnMountOrArgChange: 120` will re-render a two-minute-old
 * answer without asking the server. Being told about something and then not being shown it
 * reads as the app being broken.
 *
 * THE CONTRACT
 * ------------
 * The server already sends a `metadata` array with every notification, and
 * InAppNotificationService passes it straight through as the push `data` payload — so the
 * information was already arriving at the browser. The service worker was dropping it,
 * posting only `{type, timestamp}` to the tab.
 *
 * Now it forwards `data`, and `data.entity` names what changed in domain terms — 'house',
 * 'caretaker', 'payment'. The server says WHAT happened; this file decides which caches that
 * makes stale. Keeping the mapping here means the backend never has to know RTK Query tag
 * names, and adding a screen means editing one table rather than hunting through controllers.
 *
 * UNANNOTATED NOTIFICATIONS STILL WORK
 * ------------------------------------
 * An unknown or missing entity falls back to BROAD. Being too eager costs one refetch of
 * whatever happens to be mounted; being too narrow costs the user their trust in the screen.
 * Notifications are not frequent enough for the first to matter.
 */

// Every name here must appear in baseApi's `tagTypes`. RTK Query silently ignores tags it was
// not told about — it warns once in development and then does nothing, which is exactly how
// 56 invalidation call sites in this app came to be no-ops.
const ENTITY_TAGS = {
  house: ['House', 'Houses', 'HouseStats', 'HouseFlats', 'HouseCaretakers', 'Analytics', 'HouseOwnerAnalytics'],
  flat: ['Flat', 'HouseFlats', 'House', 'Houses', 'HouseStats', 'HouseOwnerAnalytics'],
  renter: ['Renter', 'Flat', 'HouseFlats', 'House', 'HouseOwnerAnalytics'],
  caretaker: ['Caretaker', 'CaretakerAssignment', 'HouseCaretakers', 'House', 'Houses', 'Analytics'],
  payment: ['Payment', 'PaymentReceipt', 'AdvancePayment', 'Flat', 'House', 'HouseStats', 'HouseOwnerAnalytics'],
  expense: ['HouseOwnerAnalytics', 'HouseStats', 'House', 'Analytics'],
  loan: ['Loan', 'HouseOwnerAnalytics', 'Analytics'],
  app_fee: ['AppFeePayments', 'AppFeeBreakdown', 'Analytics'],
  user: ['User', 'ManagedUsers', 'ManagedOwners', 'Analytics'],
  house_owner: ['User', 'ManagedOwners', 'ManagedUsers', 'Houses', 'Analytics'],
  permissions: ['Auth', 'User', 'ManagedUsers'],
  notice: ['Notice', 'House'],

  // A test notification changes nothing. Refetching the whole app to prove push works would
  // be its own small bug.
  none: [],
};

const BROAD = [
  'House', 'Houses', 'HouseFlats', 'HouseStats', 'HouseCaretakers',
  'Flat', 'Renter', 'Notice',
  'Payment', 'AdvancePayment', 'PaymentReceipt', 'Loan',
  'Caretaker', 'CaretakerAssignment',
  'AppFeePayments', 'AppFeeBreakdown',
  'ManagedOwners', 'ManagedUsers',
  'Analytics', 'HouseOwnerAnalytics',
];

/**
 * @param {object} [data] the push payload's `data`, or the notification row's metadata
 * @returns {string[]} tag types to invalidate
 */
export const tagsForPush = (data) => {
  const entity = data?.entity;
  if (entity && Object.prototype.hasOwnProperty.call(ENTITY_TAGS, entity)) return ENTITY_TAGS[entity];

  return BROAD;
};

export const KNOWN_ENTITIES = Object.keys(ENTITY_TAGS);
export const BROAD_TAGS = BROAD;

export default tagsForPush;

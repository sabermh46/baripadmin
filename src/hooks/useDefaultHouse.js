import { useAuth } from './index';
import { useGetHousesQuery } from '../store/api/houseApi';

/**
 * The house a screen should open on when nobody has chosen one yet.
 *
 * A house owner's house pickers all started blank, so every page behind one — loans, reports,
 * the expense form — opened on an empty state and asked them to choose from a list of one or
 * two, every single visit. There is an obvious default for that role and no default at all
 * for an admin, who picks an owner first and could be looking at any of them.
 *
 * Returned rather than applied, so callers can *derive*:
 *
 *     const effectiveHouseId = chosenHouseId || defaultHouseId;
 *
 * Pushing it into the caller's state from an effect would be the same value one render later,
 * would fight the user for a frame on first paint, and would need care to avoid overwriting a
 * real choice with the default. Deriving has none of those problems: whatever the user picked
 * simply wins.
 *
 * `isReady` matters for forms. A form seeded at mount cannot seed itself from a query that has
 * not resolved, so those callers wait for this and then mount the form keyed on the result.
 *
 * The query arguments deliberately match the ones HouseSelector already uses, so RTK Query
 * serves both from a single cache entry and this hook costs no extra request.
 */
export const useDefaultHouse = () => {
  const { isHouseOwner } = useAuth();

  const { data, isLoading, isUninitialized } = useGetHousesQuery(
    { page: 1, limit: 100 },
    { skip: !isHouseOwner }
  );

  const houses = data?.data ?? [];

  return {
    houses,
    // A string, because that is what every <select> and every house-id query parameter in
    // this app deals in. '' means "no default" — for an admin, or an owner with no houses.
    defaultHouseId: isHouseOwner ? String(houses[0]?.id ?? '') : '',
    // Skipped queries never load, so an admin is ready immediately.
    isReady: !isHouseOwner || (!isLoading && !isUninitialized),
  };
};

export default useDefaultHouse;

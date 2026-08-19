import { useMemo } from 'react';
import { useGetManagedOwnersQuery } from '../store/api/houseApi';
import { useAuth } from './index';

/**
 * The house owners the signed-in admin manages, for use in a picker.
 *
 * WHY THIS EXISTS
 * ---------------
 * Ten components call useGetManagedOwnersQuery, and each passed its own
 * `{ search, page, limit }`. RTK Query caches per serialised argument, so ten slightly
 * different argument objects meant ten separate cache entries and ten separate requests for
 * what is, in eight of those ten cases, the identical question: "which owners can I pick
 * from?" Worse, the ones that fed `search` straight into the query re-requested the whole
 * list on every keystroke.
 *
 * Two genuinely different needs were sharing one endpoint:
 *
 *   - A paginated, server-searched LIST — HouseOwnersPage and HouseOwnerHouses render
 *     hundreds of owners with paging controls. Those keep calling the query directly; server
 *     pagination is correct for them.
 *   - A picker's OPTIONS — every dropdown here just needs the set of owners to choose from.
 *
 * This hook serves the second. It asks with one fixed argument, so all eight dropdowns share
 * a single cache entry and a single request, and that entry stays warm across navigation
 * (keepUnusedDataFor is 600s). Filtering happens in memory, which also makes typing in a
 * picker instant instead of network-bound.
 */

// One fixed argument shared by every caller — this is what collapses eight cache entries
// into one. `limit` is high because a picker with a scrollbar is far cheaper than paging.
const OPTIONS_ARG = Object.freeze({ search: '', page: 1, limit: 200 });

export const useOwnerOptions = ({ search = '', skip = false } = {}) => {
  const { user } = useAuth();
  const roleSlug = user?.role?.slug;

  // A house owner picks nobody — they are the only owner in their own world. Firing this
  // for them was a guaranteed-useless request on several screens.
  const isAdmin = roleSlug === 'web_owner' || roleSlug === 'staff' || roleSlug === 'developer';

  const { data, isLoading, isFetching, error } = useGetManagedOwnersQuery(OPTIONS_ARG, {
    skip: skip || !isAdmin,
  });

  const owners = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return owners;

    return owners.filter(
      (o) =>
        o.name?.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term) ||
        o.phone?.toLowerCase().includes(term)
    );
  }, [owners, search]);

  // Ready-made <option> pairs, since almost every caller built exactly this by hand.
  const asOptions = useMemo(
    () => filtered.map((o) => ({ value: String(o.id), label: o.email ? `${o.name} (${o.email})` : o.name })),
    [filtered]
  );

  return { owners: filtered, allOwners: owners, asOptions, isLoading, isFetching, error, isAdmin };
};

export default useOwnerOptions;

// store/api/houseOwnerAnalytics.js
import { baseApi } from './baseApi';

export const houseOwnerAnalyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHouseOwnerDashboardData: builder.query({
      query: () => ({
        url: '/house-owner-analytics/dashboard',
        method: 'GET',
      }),
      transformResponse: (response) => response.data,

      /**
       * Every domain this screen aggregates, not just its own tag.
       *
       * `providesTags` declares what invalidates this entry, and it used to list only
       * `HouseOwnerAnalytics` — which nothing but the refresh button ever invalidates. So
       * recording a rent payment (`['Payment', 'Flat']`), approving an expense (`['Report']`)
       * or assigning a renter left the dashboard showing figures from before the write, for
       * up to the five-minute poll. The cache is persisted to IndexedDB, so a reload restored
       * the same stale entry rather than going to the network, which is what made it look
       * like the server had lost the payment.
       *
       * Listing the domains here rather than adding `'HouseOwnerAnalytics'` to ~35 mutations
       * puts the dependency where it belongs — on the aggregate that has it — and means a
       * mutation added later inherits it for free, as long as it invalidates the domain tag
       * it already should.
       *
       * These are exactly what HouseOwnerAnalyticsService::getDashboard() reads: House, Flat,
       * Renter, RentPayment, HouseExpense (invalidated as `Report`) and CaretakerAssignment.
       * `AdvancePayment` is included because applying an advance settles a rent payment, and
       * those mutations invalidate only `['AdvancePayment']`.
       */
      providesTags: [
        'HouseOwnerAnalytics',
        'House', 'Flat', 'Renter',
        'Payment', 'AdvancePayment',
        'Report',
        'CaretakerAssignment',
      ],

      /**
       * Paint from cache, but always revalidate.
       *
       * This is the half that made a browser reload useless. The endpoint kept
       * `keepUnusedDataFor: 300` but inherited the global `refetchOnMountOrArgChange: 120`,
       * and the api slice is persisted to IndexedDB — so on reload RTK rehydrated an entry
       * whose `fulfilledTimeStamp` was seconds old, decided it was still fresh, and issued
       * no request at all. The dashboard was reading from disk, which is why the only calls
       * on a reload were `/app-fees/me` and the avatar.
       *
       * `true`, not a number: on a screen made of money figures, a grace window during which
       * a reload is answered from disk is indistinguishable from the server having lost the
       * write. The cached copy still renders immediately while the refetch runs, so this
       * costs a background request, not a skeleton.
       *
       * Same shape as the LIVE preset in appFeeApi, except that entries are kept rather than
       * dropped at zero — the offline fallback wants something to paint, and it reads its own
       * localStorage copy rather than this one.
       */
      keepUnusedDataFor: 300,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),

    /**
     * Recompute and return the dashboard as it stands right now.
     *
     * Not used by the refresh button, which simply refetches the query above — there is no
     * server-side cache to clear, so a POST followed by the GET it invalidates was two
     * requests returning the same 6.7 kB for one click. Kept because the route is published
     * and is called directly, and it now answers with the data rather than a bare
     * `{success: true}`.
     */
    refreshDashboardData: builder.mutation({
      query: () => ({
        url: '/house-owner-analytics/refresh-dashboard',
        method: 'POST',
      }),
      invalidatesTags: ['HouseOwnerAnalytics'],
    }),
  })
});

export const {
  useGetHouseOwnerDashboardDataQuery,
    useRefreshDashboardDataMutation
} = houseOwnerAnalyticsApi;

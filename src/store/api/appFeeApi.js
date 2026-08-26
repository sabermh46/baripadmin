import { baseApi } from './baseApi';

/**
 * App-fee endpoints are deliberately exempt from the app-wide cache policy.
 *
 * baseApi keeps query data for 600s and, through `refetchOnMountOrArgChange: 120`, will
 * happily re-render a two-minute-old answer without asking the server. That is the right
 * default for a list of flats, and the wrong one here: this is the money surface, an admin is
 * told by push notification the moment something changes, and opening the page to find the
 * old figures reads as the system being broken.
 *
 * So: nothing is kept once nothing is watching it, every mount refetches, and returning to
 * the tab or the network refetches too. Push-driven invalidation (see App.jsx) covers the
 * instant case; the polling on the pages themselves is only a backstop for when push is not
 * granted or has silently lapsed.
 */
const LIVE = {
  // Drop the moment the last subscriber unmounts — never re-render a stale figure.
  keepUnusedDataFor: 0,
  // `true`, not a number of seconds: refetch on every mount, no grace window.
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

export const appFeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppFeePayments: builder.query({
      ...LIVE,
      query: (params = {}) => ({
        url: '/app-fees/payments',
        method: 'GET',
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          house_owner_id: params.house_owner_id,
          status: params.status,
          fee_type: params.fee_type,
          payment_method: params.payment_method,
          start_date: params.start_date,
          end_date: params.end_date,
          search: params.search,
        },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'AppFeePayments', id })),
              { type: 'AppFeePayments', id: 'LIST' },
            ]
          : [{ type: 'AppFeePayments', id: 'LIST' }],
    }),

    getAppFeePayment: builder.query({
      ...LIVE,
      query: (id) => ({
        url: `/app-fees/payments/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'AppFeePayments', id }],
    }),

    createAppFeePayment: builder.mutation({
      query: (body) => ({
        url: '/app-fees/payments',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: [{ type: 'AppFeePayments', id: 'LIST' }],
    }),

    updateAppFeePayment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/app-fees/payments/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AppFeePayments', id },
        { type: 'AppFeePayments', id: 'LIST' },
      ],
    }),

    deleteAppFeePayment: builder.mutation({
      query: (id) => ({
        url: `/app-fees/payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'AppFeePayments', id },
        { type: 'AppFeePayments', id: 'LIST' },
      ],
    }),

    // Portfolio figures for the admin overview. Tagged with the payments LIST id so
    // verifying/creating/deleting an invoice refreshes the cards without a manual reload.
    getAppFeeStats: builder.query({
      ...LIVE,
      query: () => ({ url: '/app-fees/payments/stats', method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }, { type: 'AppFeePayments', id: 'STATS' }],
    }),

    // The rows behind one overview tile, fetched only when that tile is clicked — hence a
    // parameterised query rather than eight more fields on getAppFeeStats, which every admin
    // page load would otherwise have to pay for.
    getAppFeeBreakdown: builder.query({
      ...LIVE,
      query: (metric) => ({
        url: '/app-fees/payments/stats/breakdown',
        method: 'GET',
        params: { metric },
      }),
      providesTags: (result, error, metric) => [
        { type: 'AppFeePayments', id: 'LIST' },
        { type: 'AppFeeBreakdown', id: metric },
      ],
    }),

    // Two integers behind the sidebar badges. Separate from the stats query because the nav
    // mounts on every page while the stats page does not.
    getAppFeeBadgeCounts: builder.query({
      ...LIVE,
      query: () => ({ url: '/app-fees/badge-counts', method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }, { type: 'AppFeePayments', id: 'BADGES' }],
    }),

    // The owner-facing app-fee page in one request: subscription status, amount due, the
    // invoice list, and which invoice needs acting on. Replaces getAppFeeStatus +
    // getAppFeeDue + getAppFeePayments, which were three calls for one screen — and which
    // sent the caretaker's own id as a house-owner id and got 403 for two of the three.
    getMyAppFee: builder.query({
      ...LIVE,
      query: (houseOwnerId) => ({
        url: '/app-fees/me',
        method: 'GET',
        params: houseOwnerId ? { house_owner_id: houseOwnerId } : undefined,
      }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }, { type: 'AppFeePayments', id: 'ME' }],
    }),

    // A single owner's live subscription state, straight from AppFeeStatusService — the one
    // definition of "expired" that the gate middleware also enforces.
    getAppFeeStatus: builder.query({
      ...LIVE,
      query: (houseOwnerId) => ({ url: `/app-fees/payments/status/${houseOwnerId}`, method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }],
    }),

    getAppFeeDue: builder.query({
      ...LIVE,
      query: (houseOwnerId) => ({ url: `/app-fees/payments/calculate-due/${houseOwnerId}`, method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAppFeePaymentsQuery,
  useGetAppFeePaymentQuery,
  useCreateAppFeePaymentMutation,
  useUpdateAppFeePaymentMutation,
  useDeleteAppFeePaymentMutation,
  useGetAppFeeStatsQuery,
  useGetAppFeeBreakdownQuery,
  useGetMyAppFeeQuery,
  useGetAppFeeBadgeCountsQuery,
  useGetAppFeeStatusQuery,
  useGetAppFeeDueQuery,
} = appFeeApi;

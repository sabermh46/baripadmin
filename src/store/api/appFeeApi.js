import { baseApi } from './baseApi';

export const appFeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppFeePayments: builder.query({
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
      query: () => ({ url: '/app-fees/payments/stats', method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }, { type: 'AppFeePayments', id: 'STATS' }],
    }),

    // The rows behind one overview tile, fetched only when that tile is clicked — hence a
    // parameterised query rather than eight more fields on getAppFeeStats, which every admin
    // page load would otherwise have to pay for.
    getAppFeeBreakdown: builder.query({
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
      query: () => ({ url: '/app-fees/badge-counts', method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }, { type: 'AppFeePayments', id: 'BADGES' }],
    }),

    // A single owner's live subscription state, straight from AppFeeStatusService — the one
    // definition of "expired" that the gate middleware also enforces.
    getAppFeeStatus: builder.query({
      query: (houseOwnerId) => ({ url: `/app-fees/payments/status/${houseOwnerId}`, method: 'GET' }),
      providesTags: [{ type: 'AppFeePayments', id: 'LIST' }],
    }),

    getAppFeeDue: builder.query({
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
  useGetAppFeeBadgeCountsQuery,
  useGetAppFeeStatusQuery,
  useGetAppFeeDueQuery,
} = appFeeApi;

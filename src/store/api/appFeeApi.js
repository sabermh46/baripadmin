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
  }),
});

export const {
  useGetAppFeePaymentsQuery,
  useGetAppFeePaymentQuery,
  useCreateAppFeePaymentMutation,
  useUpdateAppFeePaymentMutation,
  useDeleteAppFeePaymentMutation,
} = appFeeApi;

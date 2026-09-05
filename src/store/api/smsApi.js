import { baseApi } from './baseApi';

/**
 * SMS allowance: the platform default, each house owner's balance, and the send log.
 *
 * SMS is the only channel that costs the platform owner money per message, so unlike push
 * and email it has a balance that can run out — which is why the sender needs to be able to
 * ask about it before offering the option, not only discover it on a failed send.
 */
export const smsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // The sender's own view: can they afford an SMS, and is there a gateway at all.
    getSmsBalance: builder.query({
      query: (houseOwnerId) => ({
        url: '/sms/balance',
        method: 'GET',
        params: houseOwnerId ? { houseOwnerId } : undefined,
      }),
      transformResponse: (r) => r?.data ?? null,
      providesTags: ['SmsAllowance'],
    }),

    getSmsSettings: builder.query({
      query: () => ({ url: '/admin/sms/settings', method: 'GET' }),
      transformResponse: (r) => r?.data ?? null,
      providesTags: ['SmsSettings'],
    }),

    updateSmsSettings: builder.mutation({
      query: (body) => ({ url: '/admin/sms/settings', method: 'PUT', data: body }),
      invalidatesTags: ['SmsSettings', 'SmsAllowance'],
    }),

    getSmsAllowances: builder.query({
      query: ({ search, page = 1, limit = 20 } = {}) => ({
        url: '/admin/sms/allowances',
        method: 'GET',
        params: { search: search || undefined, page, limit },
      }),
      providesTags: ['SmsAllowance'],
    }),

    adjustSmsAllowance: builder.mutation({
      query: ({ userId, delta, note }) => ({
        url: `/admin/sms/allowances/${userId}/adjust`,
        method: 'POST',
        data: { delta, note },
      }),
      invalidatesTags: ['SmsAllowance'],
    }),

    getSmsLogs: builder.query({
      query: ({ userId, status, page = 1, limit = 25 } = {}) => ({
        url: '/admin/sms/logs',
        method: 'GET',
        params: { userId: userId || undefined, status: status || undefined, page, limit },
      }),
      providesTags: ['SmsLog'],
    }),
  }),
});

export const {
  useGetSmsBalanceQuery,
  useGetSmsSettingsQuery,
  useUpdateSmsSettingsMutation,
  useGetSmsAllowancesQuery,
  useAdjustSmsAllowanceMutation,
  useGetSmsLogsMutation,
  useGetSmsLogsQuery,
} = smsApi;

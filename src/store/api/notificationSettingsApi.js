import { baseApi } from './baseApi';

/**
 * Live, like the other settings surfaces: this decides whether whole roles can be contacted,
 * and two admins editing a stale matrix would overwrite each other's decisions silently.
 */
const LIVE = {
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

export const notificationSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotificationSettings: builder.query({
      ...LIVE,
      query: () => ({ url: '/admin/notification-settings', method: 'GET' }),
      providesTags: [{ type: 'NotificationSettings', id: 'ALL' }],
    }),

    updateNotificationChannel: builder.mutation({
      // `enabled: null` clears an override so the row inherits its role again.
      query: (body) => ({ url: '/admin/notification-settings', method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'NotificationSettings', id: 'ALL' }],
    }),

    getSmsProviders: builder.query({
      ...LIVE,
      query: () => ({ url: '/admin/notification-settings/sms-providers', method: 'GET' }),
      providesTags: [{ type: 'SmsProvider', id: 'LIST' }],
    }),

    saveSmsProvider: builder.mutation({
      query: ({ id, ...body }) => ({
        url: id ? `/admin/notification-settings/sms-providers/${id}` : '/admin/notification-settings/sms-providers',
        method: id ? 'PUT' : 'POST',
        data: body,
      }),
      invalidatesTags: [{ type: 'SmsProvider', id: 'LIST' }, { type: 'NotificationSettings', id: 'ALL' }],
    }),

    deleteSmsProvider: builder.mutation({
      query: (id) => ({ url: `/admin/notification-settings/sms-providers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SmsProvider', id: 'LIST' }, { type: 'NotificationSettings', id: 'ALL' }],
    }),

    testSmsProvider: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/notification-settings/sms-providers/${id}/test`,
        method: 'POST',
        data: body,
      }),
      // A live test stamps last_test_result on the row.
      invalidatesTags: (r, e, { dryRun }) => (dryRun ? [] : [{ type: 'SmsProvider', id: 'LIST' }]),
    }),
  }),
});

export const {
  useGetNotificationSettingsQuery,
  useUpdateNotificationChannelMutation,
  useGetSmsProvidersQuery,
  useSaveSmsProviderMutation,
  useDeleteSmsProviderMutation,
  useTestSmsProviderMutation,
} = notificationSettingsApi;

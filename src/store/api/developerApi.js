import { baseApi } from './baseApi';

/**
 * The developer panel.
 *
 * Live, like the other settings surfaces: these endpoints change platform-wide delivery
 * behaviour, and two people editing a stale matrix would silently overwrite each other's
 * decisions. A cached toggle grid is worse than a slow one — it shows a state that is not
 * true and invites a click that undoes somebody else's change.
 */
const LIVE = {
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
};

export const developerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDeveloperOverview: builder.query({
      ...LIVE,
      query: () => ({ url: '/developer', method: 'GET' }),
      providesTags: [{ type: 'DeveloperPanel', id: 'OVERVIEW' }],
    }),

    getPushEvents: builder.query({
      ...LIVE,
      query: () => ({ url: '/developer/push-events', method: 'GET' }),
      providesTags: [{ type: 'PushEvent', id: 'ALL' }],
    }),

    updatePushEvent: builder.mutation({
      // `enabled: null` clears the override so the pair follows the catalog default again.
      query: (body) => ({ url: '/developer/push-events', method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'PushEvent', id: 'ALL' }],
    }),

    resetPushEvents: builder.mutation({
      query: () => ({ url: '/developer/push-events/reset', method: 'POST' }),
      invalidatesTags: [{ type: 'PushEvent', id: 'ALL' }],
    }),

    // App-fee notifications: bell and push per event, the reminder schedule, and how a
    // payment confirmed with the next invoice is announced. See AppFeeNotificationSettings.
    getAppFeeNotificationSettings: builder.query({
      ...LIVE,
      query: () => ({ url: '/developer/app-fee-notifications', method: 'GET' }),
      providesTags: [{ type: 'PushEvent', id: 'APP_FEE' }],
    }),

    updateAppFeeNotificationSettings: builder.mutation({
      query: (body) => ({ url: '/developer/app-fee-notifications', method: 'PUT', data: body }),
      invalidatesTags: [{ type: 'PushEvent', id: 'APP_FEE' }, { type: 'PushEvent', id: 'APP_FEE_PREVIEW' }],
    }),

    resetAppFeeNotificationSettings: builder.mutation({
      query: () => ({ url: '/developer/app-fee-notifications/reset', method: 'POST' }),
      invalidatesTags: [{ type: 'PushEvent', id: 'APP_FEE' }, { type: 'PushEvent', id: 'APP_FEE_PREVIEW' }],
    }),

    // Counts only: how many owners the next reminder run would reach, per stage.
    getAppFeeReminderPreview: builder.query({
      ...LIVE,
      query: () => ({ url: '/developer/app-fee-notifications/preview', method: 'GET' }),
      providesTags: [{ type: 'PushEvent', id: 'APP_FEE_PREVIEW' }],
    }),

    // Mail & SMS pit (off production only): what MAIL_MAILER=pit / SMS_PIT=true caught.
    getPitMessages: builder.query({
      query: ({ channel, q }) => ({ url: '/developer/pit', method: 'GET', params: { channel, ...(q ? { q } : {}) } }),
      providesTags: ['Pit'],
    }),
    getPitMessage: builder.query({
      query: (id) => ({ url: `/developer/pit/${id}`, method: 'GET' }),
      // Opening a message marks it read, which the list's unread counts need to show.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => {});
        dispatch(developerApi.util.invalidateTags(['Pit']));
      },
    }),
    deletePitMessage: builder.mutation({
      query: (id) => ({ url: `/developer/pit/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Pit'],
    }),
    clearPit: builder.mutation({
      query: (channel) => ({ url: '/developer/pit', method: 'DELETE', params: channel ? { channel } : {} }),
      invalidatesTags: ['Pit'],
    }),
  }),
});

export const {
  useGetDeveloperOverviewQuery,
  useGetPushEventsQuery,
  useUpdatePushEventMutation,
  useResetPushEventsMutation,
  useGetAppFeeNotificationSettingsQuery,
  useUpdateAppFeeNotificationSettingsMutation,
  useResetAppFeeNotificationSettingsMutation,
  useGetAppFeeReminderPreviewQuery,
  useGetPitMessagesQuery,
  useGetPitMessageQuery,
  useDeletePitMessageMutation,
  useClearPitMutation,
} = developerApi;

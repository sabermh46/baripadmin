// src/store/api/notificationApi.js
import { baseApi } from './baseApi';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get notifications with pagination
    getNotifications: builder.query({
      query: (params = {}) => ({
        url: '/api/notifications',
        method: 'GET',
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          unread: params.unread || false,
          type: params.type || '',
          startDate: params.startDate || '',
          endDate: params.endDate || ''
        }
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notification', id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    // Get notification by ID
    getNotificationById: builder.query({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),

    // Mark notification as read
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' }
      ],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation({
      query: () => ({
        url: '/api/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' }
      ],
    }),

    // Delete notification
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' }
      ],
    }),

    // Toggle read status
    toggleRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}/toggle-read`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' }
      ],
    }),

    // Mark multiple notifications as read
    markMultipleAsRead: builder.mutation({
      query: (notificationIds) => ({
        url: '/api/notifications/batch/read',
        method: 'POST',
        data: { notificationIds },
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' }
      ],
    }),

    // Get notification stats
    getNotificationStats: builder.query({
      query: () => ({
        url: '/api/notifications/stats/summary',
        method: 'GET',
      }),
      providesTags: [{ type: 'Notification', id: 'STATS' }],
    }),

    // Get unread count
    getUnreadCount: builder.query({
      query: () => ({
        url: '/api/notifications',
        method: 'GET',
        params: { limit: 1, unread: true }
      }),
      transformResponse: (response) => response.counts?.unread || 0,
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),

    // Delete all read notifications
    deleteAllRead: builder.mutation({
      query: () => ({
        url: '/api/notifications/read/all',
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'STATS' }
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetNotificationByIdQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useToggleReadMutation,
  useMarkMultipleAsReadMutation,
  useGetNotificationStatsQuery,
  useGetUnreadCountQuery,
  useDeleteAllReadMutation,
  useLazyGetNotificationsQuery,
} = notificationApi;
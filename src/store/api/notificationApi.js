// src/store/api/notificationApi.js
import { baseApi } from './baseApi';

/**
 * Notification cache, with every mutation applied optimistically.
 *
 * WHY OPTIMISTIC RATHER THAN INVALIDATE-AND-REFETCH
 * -------------------------------------------------
 * Marking one notification read used to cost up to five round trips: the POST itself, then
 * an invalidation-driven refetch of both the list and the unread count, then a *second*
 * refetch of both because the hook also called refresh() by hand. The UI could not update
 * until the slowest of those returned, so a single click on the bell felt like a page load.
 *
 * Every one of these mutations has a completely predictable effect on the cache — read
 * flips, a row disappears, a counter moves by one. So the cache is patched immediately and
 * the request is fired in the background. One request per action, and the badge reacts on
 * the same frame as the click. `queryFulfilled` rejecting rolls every patch back, so a
 * failed request restores exactly the previous state rather than leaving a lie on screen.
 *
 * There is deliberately NO invalidatesTags on the patched mutations: an invalidation would
 * re-fetch the very data we just computed, which is the cost this design exists to remove.
 */

/**
 * A notification list is cached once per filter combination (the page filters, the bell's
 * defaults, an unread-only view…). A mutation has to touch all of them, or the badge and the
 * list disagree until something refetches. Patching by cached args covers every live entry.
 */
const patchEveryList = (dispatch, getState, recipe) => {
  const cachedArgs = notificationApi.util.selectCachedArgsForQuery(getState(), 'getNotifications');

  return cachedArgs.map((args) =>
    dispatch(notificationApi.util.updateQueryData('getNotifications', args, recipe))
  );
};

const patchUnreadCount = (dispatch, recipe) =>
  dispatch(notificationApi.util.updateQueryData('getUnreadCount', undefined, recipe));

/** Runs the patches, fires the request, and undoes everything if the server rejects it. */
const optimistically = async ({ dispatch, getState, queryFulfilled }, listRecipe, countRecipe) => {
  const patches = patchEveryList(dispatch, getState, listRecipe);
  if (countRecipe) patches.push(patchUnreadCount(dispatch, countRecipe));

  try {
    await queryFulfilled;
  } catch {
    patches.forEach((p) => p.undo());
  }
};

/** Keeps `counts.unread` on the list payload in step with the rows we just changed. */
const bumpCounts = (draft, { unread = 0, total = 0 }) => {
  if (!draft?.counts) return;
  draft.counts.unread = Math.max(0, (draft.counts.unread ?? 0) + unread);
  draft.counts.total = Math.max(0, (draft.counts.total ?? 0) + total);
};

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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

    getNotificationById: builder.query({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),

    // The badge. Cheap on the server (two indexed COUNTs) and the only notification query
    // that runs on every page, so it is the one worth polling — see useNotifications for
    // the interval and the focus rule.
    getUnreadCount: builder.query({
      query: () => ({
        url: '/api/notifications/unread-count',
        method: 'GET',
      }),
      transformResponse: (response) => response.unread || 0,
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),

    markAsRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}/read`,
        method: 'POST',
      }),
      async onQueryStarted(id, api) {
        let wasUnread = false;

        await optimistically(
          api,
          (draft) => {
            const row = draft?.notifications?.find((n) => n.id === id);
            if (!row || row.read) return;
            wasUnread = true;
            row.read = true;
            row.readAt = new Date().toISOString();
            bumpCounts(draft, { unread: -1 });
          },
          // The count query is a bare number, so the recipe returns rather than mutates.
          // Guarded on wasUnread: re-reading an already-read row must not move the badge.
          (count) => (wasUnread ? Math.max(0, count - 1) : count)
        );
      },
    }),

    toggleRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}/toggle-read`,
        method: 'POST',
      }),
      async onQueryStarted(id, api) {
        let delta = 0;

        await optimistically(
          api,
          (draft) => {
            const row = draft?.notifications?.find((n) => n.id === id);
            if (!row) return;
            const nowRead = !row.read;
            delta = nowRead ? -1 : 1;
            row.read = nowRead;
            row.readAt = nowRead ? new Date().toISOString() : null;
            bumpCounts(draft, { unread: delta });
          },
          (count) => Math.max(0, count + delta)
        );
      },
    }),

    markAllAsRead: builder.mutation({
      query: () => ({
        url: '/api/notifications/read-all',
        method: 'POST',
      }),
      async onQueryStarted(_arg, api) {
        await optimistically(
          api,
          (draft) => {
            const stamp = new Date().toISOString();
            draft?.notifications?.forEach((n) => {
              if (!n.read) {
                n.read = true;
                n.readAt = stamp;
              }
            });
            if (draft?.counts) draft.counts.unread = 0;
          },
          () => 0
        );
      },
    }),

    markMultipleAsRead: builder.mutation({
      query: (notificationIds) => ({
        url: '/api/notifications/batch/read',
        method: 'POST',
        data: { notificationIds },
      }),
      async onQueryStarted(notificationIds, api) {
        const ids = new Set(notificationIds);
        let cleared = 0;
        let measured = false;

        await optimistically(
          api,
          (draft) => {
            const stamp = new Date().toISOString();
            let clearedHere = 0;
            draft?.notifications?.forEach((n) => {
              if (ids.has(n.id) && !n.read) {
                n.read = true;
                n.readAt = stamp;
                clearedHere++;
              }
            });
            bumpCounts(draft, { unread: -clearedHere });
            // Every cached list holds the same rows under different filters, so count the
            // first one only — summing across entries would decrement the badge repeatedly
            // for the same notification.
            if (!measured) {
              cleared = clearedHere;
              measured = true;
            }
          },
          (count) => Math.max(0, count - cleared)
        );
      },
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(id, api) {
        let wasUnread = false;

        await optimistically(
          api,
          (draft) => {
            const at = draft?.notifications?.findIndex((n) => n.id === id);
            if (at == null || at < 0) return;
            wasUnread = !draft.notifications[at].read;
            draft.notifications.splice(at, 1);
            bumpCounts(draft, { unread: wasUnread ? -1 : 0, total: -1 });
            if (draft.pagination?.total != null) {
              draft.pagination.total = Math.max(0, draft.pagination.total - 1);
            }
          },
          (count) => (wasUnread ? Math.max(0, count - 1) : count)
        );
      },
    }),

    deleteAllRead: builder.mutation({
      query: () => ({
        url: '/api/notifications/read/all',
        method: 'DELETE',
      }),
      async onQueryStarted(_arg, api) {
        // Read rows only, so the unread badge cannot move — no count recipe.
        await optimistically(api, (draft) => {
          if (!draft?.notifications) return;
          const before = draft.notifications.length;
          draft.notifications = draft.notifications.filter((n) => !n.read);
          const removed = before - draft.notifications.length;
          bumpCounts(draft, { total: -removed });
          if (draft.pagination?.total != null) {
            draft.pagination.total = Math.max(0, draft.pagination.total - removed);
          }
        });
      },
      // Stats are derived server-side and not worth predicting.
      invalidatesTags: [{ type: 'Notification', id: 'STATS' }],
    }),

    getNotificationStats: builder.query({
      query: () => ({
        url: '/api/notifications/stats/summary',
        method: 'GET',
      }),
      providesTags: [{ type: 'Notification', id: 'STATS' }],
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

// src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  notificationApi,
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useToggleReadMutation,
  useMarkMultipleAsReadMutation,
  useGetUnreadCountQuery,
  useDeleteAllReadMutation,
} from '../store/api/notificationApi';

/**
 * The single notification hook. The bell in the header and the full notification page both
 * use this one — there is no second implementation and no second polling timer.
 *
 * HOW THE TWO CONSUMERS SHARE ONE REQUEST
 * ---------------------------------------
 * RTK Query caches a query per serialised argument, so two components asking for the same
 * filters share one cache entry and one network request. DEFAULT_FILTERS below is therefore
 * load-bearing: the bell passes nothing and the page starts unfiltered, so on the
 * notification page both land on the identical key and the list is fetched once. The page
 * only forks onto its own cache entry once the user actually filters — which is correct,
 * because at that point they are asking for different data.
 *
 * The bell additionally passes `skip` until it is first opened, so a user who never touches
 * it never pays for the list at all — only the badge count.
 *
 * WHAT THIS HOOK NO LONGER DOES
 * -----------------------------
 * It used to call refresh() after every mutation, on top of the tag invalidation those
 * mutations already triggered. Both are gone: the mutations patch the cache optimistically
 * (see notificationApi.js), so the UI updates on the click and nothing refetches.
 */

// Frozen so a caller cannot mutate the shared default and silently split the cache key.
const DEFAULT_FILTERS = Object.freeze({
  page: 1,
  limit: 20,
  unread: false,
  type: '',
  startDate: '',
  endDate: '',
});

/**
 * The badge is the only notification request that runs on every page of the app, so it is
 * the only one polled — and it polls slowly. At the old 60s it cost ~60 requests an hour per
 * open tab to catch events that push notifications already deliver instantly. Five minutes
 * is a backstop for browsers where push is denied or unavailable, not the primary path.
 */
const UNREAD_POLL_MS = 5 * 60 * 1000;

/**
 * Nudges the cache after a push or a cross-tab signal.
 *
 * Invalidating tags rather than calling refetch() matters: refetch() forces a request even
 * for a query nobody is rendering, so a push used to re-download the bell's list for every
 * open tab even when the dropdown was closed. Invalidation only refetches what is actually
 * subscribed — the badge always, the list only if something is showing it.
 */
export const useNotificationSync = () => {
  const dispatch = useDispatch();

  return useCallback(() => {
    dispatch(
      notificationApi.util.invalidateTags([
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ])
    );
  }, [dispatch]);
};

const useNotifications = (options = {}) => {
  const { skip = false, ...initialFilters } = options;

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...initialFilters }));
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  const sync = useNotificationSync();

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    isFetching,
    error: notificationsError,
  } = useGetNotificationsQuery(filters, { skip });

  const { data: unreadCount = 0, isLoading: isLoadingUnreadCount } = useGetUnreadCountQuery(
    undefined,
    {
      pollingInterval: UNREAD_POLL_MS,
      // A backgrounded tab cannot show a badge to anyone. Without this, every open tab kept
      // polling forever, which is most of what the old timer actually cost.
      skipPollingIfUnfocused: true,
    }
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [toggleRead] = useToggleReadMutation();
  const [markMultipleAsRead] = useMarkMultipleAsReadMutation();
  const [deleteAllRead] = useDeleteAllReadMutation();

  const notifications = useMemo(
    () => notificationsData?.notifications ?? [],
    [notificationsData]
  );
  const pagination = notificationsData?.pagination ?? {};
  const counts = notificationsData?.counts ?? { total: 0, unread: 0 };

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const loadMore = useCallback(() => {
    if (pagination.hasNextPage) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.hasNextPage]);

  /**
   * A push arrived, or another tab changed something. App.jsx fans every source
   * (service-worker message, BroadcastChannel, storage event, tab regaining focus) into
   * these two events, so this hook does not listen for visibilitychange itself any more —
   * it did, and every notification-related refresh therefore happened twice.
   */
  useEffect(() => {
    window.addEventListener('refreshNotifications', sync);
    window.addEventListener('notificationReceived', sync);

    return () => {
      window.removeEventListener('refreshNotifications', sync);
      window.removeEventListener('notificationReceived', sync);
    };
  }, [sync]);

  // Mutations below are optimistic, so these resolve visually before the request finishes.
  // They still await, so a caller can react to a genuine failure.
  const handleMarkAsRead = useCallback(
    async (id) => {
      try {
        await markAsRead(id).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to mark as read:', error);
        return false;
      }
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      return true;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return false;
    }
  }, [markAllAsRead]);

  const handleDeleteNotification = useCallback(
    async (id) => {
      setSelectedNotifications((prev) => prev.filter((selected) => selected !== id));
      try {
        await deleteNotification(id).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to delete notification:', error);
        return false;
      }
    },
    [deleteNotification]
  );

  const handleToggleRead = useCallback(
    async (id) => {
      try {
        await toggleRead(id).unwrap();
        return true;
      } catch (error) {
        console.error('Failed to toggle read status:', error);
        return false;
      }
    },
    [toggleRead]
  );

  const handleMarkSelectedAsRead = useCallback(async () => {
    if (selectedNotifications.length === 0) return false;

    const batch = selectedNotifications;
    setSelectedNotifications([]);
    try {
      await markMultipleAsRead(batch).unwrap();
      return true;
    } catch (error) {
      console.error('Failed to mark selected as read:', error);
      return false;
    }
  }, [selectedNotifications, markMultipleAsRead]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedNotifications.length === 0) return false;

    const batch = selectedNotifications;
    setSelectedNotifications([]);
    try {
      await Promise.all(batch.map((id) => deleteNotification(id).unwrap()));
      return true;
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
      return false;
    }
  }, [selectedNotifications, deleteNotification]);

  const handleDeleteAllRead = useCallback(async () => {
    try {
      await deleteAllRead().unwrap();
      return true;
    } catch (error) {
      console.error('Failed to delete all read notifications:', error);
      return false;
    }
  }, [deleteAllRead]);

  const handleSelectAll = useCallback(() => {
    setSelectedNotifications((prev) =>
      prev.length === notifications.length ? [] : notifications.map((n) => n.id)
    );
  }, [notifications]);

  const handleSelectNotification = useCallback((id) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id]
    );
  }, []);

  const clearSelections = useCallback(() => setSelectedNotifications([]), []);

  return {
    notifications,
    unreadCount,
    selectedNotifications,
    filters,
    pagination,
    counts,

    // Only the first load blanks the UI. A background revalidation keeps the current rows
    // on screen, which is the whole point of having them cached.
    loading: isLoadingNotifications || isLoadingUnreadCount,
    isFetching,
    error: notificationsError,

    refresh: sync,
    updateFilters,
    loadMore,

    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    toggleRead: handleToggleRead,
    markSelectedAsRead: handleMarkSelectedAsRead,
    deleteSelected: handleDeleteSelected,
    deleteAllRead: handleDeleteAllRead,

    selectAll: handleSelectAll,
    selectNotification: handleSelectNotification,
    clearSelections,
    setSelectedNotifications,

    hasMore: pagination.hasNextPage,
    isAllSelected:
      selectedNotifications.length > 0 && selectedNotifications.length === notifications.length,
    isIndeterminate:
      selectedNotifications.length > 0 && selectedNotifications.length < notifications.length,
  };
};

export default useNotifications;

// src/hooks/useNotifications.js - Updated version
import { useState, useEffect, useCallback } from 'react';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useToggleReadMutation,
  useMarkMultipleAsReadMutation,
  useGetUnreadCountQuery,
  useDeleteAllReadMutation,
  useLazyGetNotificationsQuery,
} from '../store/api/notificationApi';

const useNotifications = (initialFilters = {}) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    unread: false,
    type: '',
    startDate: '',
    endDate: '',
    ...initialFilters
  });

  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // RTK Query hooks
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(filters);

  const { 
    data: unreadCount = 0, 
    refetch: refetchUnreadCount,
    isLoading: isLoadingUnreadCount 
  } = useGetUnreadCountQuery(undefined, {
    // Poll for unread count every 30 seconds
    pollingInterval: 30000,
  });

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [toggleRead] = useToggleReadMutation();
  const [markMultipleAsRead] = useMarkMultipleAsReadMutation();
  const [deleteAllRead] = useDeleteAllReadMutation();
  const [triggerGetNotifications] = useLazyGetNotificationsQuery();

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination || {};
  const counts = notificationsData?.counts || { total: 0, unread: 0 };

  // Enhanced refresh function
  const refresh = useCallback((force = false) => {
    console.log('Refreshing notifications', { force, lastUpdateTime });
    
    refetchNotifications();
    refetchUnreadCount();
    
    if (force) {
      setLastUpdateTime(Date.now());
    }
  }, [refetchNotifications, refetchUnreadCount]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (pagination.hasNextPage) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.hasNextPage]);

  // Listen for real-time updates
  useEffect(() => {
    const handleRefreshNotifications = () => {
      console.log('Handling refresh notifications event');
      refresh(true);
    };

    const handleNotificationReceived = (event) => {
      console.log('Notification received event:', event.detail);
      refresh(true);
      
      // Optional: Show a toast or visual indicator
      if ('Notification' in window && Notification.permission === 'granted') {
        // You could show a subtle toast here
      }
    };

    // Listen for custom events
    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    window.addEventListener('notificationReceived', handleNotificationReceived);

    // Also listen for visibility change to refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll for updates when tab is visible
    let pollInterval;
    const startPolling = () => {
      if (!document.hidden && unreadCount > 0) {
        pollInterval = setInterval(() => {
          refresh();
        }, 60000); // Poll every minute when there are unread notifications
      }
    };

    startPolling();

    // Restart polling when tab becomes visible
    const handlePollingRestart = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      startPolling();
    };

    document.addEventListener('visibilitychange', handlePollingRestart);

    return () => {
      window.removeEventListener('refreshNotifications', handleRefreshNotifications);
      window.removeEventListener('notificationReceived', handleNotificationReceived);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handlePollingRestart);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [refresh, unreadCount]);

  // Handle mark as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId).unwrap();
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      return false;
    }
  }, [markAsRead, refresh]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return false;
    }
  }, [markAllAsRead, refresh]);

  // Handle delete notification
  const handleDeleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotification(notificationId).unwrap();
      // Remove from selected notifications if present
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }, [deleteNotification, refresh]);

  // Handle toggle read
  const handleToggleRead = useCallback(async (notificationId) => {
    try {
      await toggleRead(notificationId).unwrap();
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to toggle read status:', error);
      return false;
    }
  }, [toggleRead, refresh]);

  // Handle mark selected as read
  const handleMarkSelectedAsRead = useCallback(async () => {
    if (selectedNotifications.length === 0) return false;
    
    try {
      await markMultipleAsRead(selectedNotifications).unwrap();
      setSelectedNotifications([]);
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to mark selected as read:', error);
      return false;
    }
  }, [selectedNotifications, markMultipleAsRead, refresh]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedNotifications.length === 0) return false;
    
    try {
      // Delete each selected notification
      const promises = selectedNotifications.map(id => deleteNotification(id).unwrap());
      await Promise.all(promises);
      setSelectedNotifications([]);
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
      return false;
    }
  }, [selectedNotifications, deleteNotification, refresh]);

  // Handle delete all read
  const handleDeleteAllRead = useCallback(async () => {
    try {
      await deleteAllRead().unwrap();
      refresh();
      return true;
    } catch (error) {
      console.error('Failed to delete all read notifications:', error);
      return false;
    }
  }, [deleteAllRead, refresh]);

  // Select/deselect all notifications
  const handleSelectAll = useCallback(() => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  }, [notifications, selectedNotifications.length]);

  // Select/deselect single notification
  const handleSelectNotification = useCallback((notificationId) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  }, []);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedNotifications([]);
  }, []);

  return {
    // Data
    notifications,
    unreadCount,
    selectedNotifications,
    filters,
    pagination,
    counts,
    lastUpdateTime,
    
    // Loading states
    loading: isLoadingNotifications || isLoadingUnreadCount,
    
    // Errors
    error: notificationsError,
    
    // Actions
    refresh: () => refresh(true),
    updateFilters,
    loadMore,
    
    // Notification actions
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    toggleRead: handleToggleRead,
    markSelectedAsRead: handleMarkSelectedAsRead,
    deleteSelected: handleDeleteSelected,
    deleteAllRead: handleDeleteAllRead,
    
    // Selection actions
    selectAll: handleSelectAll,
    selectNotification: handleSelectNotification,
    clearSelections,
    setSelectedNotifications,
    
    // Utility
    hasMore: pagination.hasNextPage,
    isAllSelected: selectedNotifications.length > 0 && 
                   selectedNotifications.length === notifications.length,
    isIndeterminate: selectedNotifications.length > 0 && 
                     selectedNotifications.length < notifications.length,
  };
};

export default useNotifications;
// src/components/notifications/NotificationIcon.jsx - Updated version
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

const NotificationIcon = () => {
    const {t} = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        notifications,
        unreadCount,
        loading,
        refresh,
        markAsRead,
        deleteNotification,
        toggleRead
    } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleOpen = async () => {
        const newState = !isOpen;
        setIsOpen(newState);
        
        if (newState) {
            // Refresh notifications when dropdown opens
            await handleRefresh();
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            try {
                await markAsRead(notification.id);
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }
        
        // Navigate to notification action if available
        if (notification.metadata?.url) {
            window.location.href = notification.metadata.url;
        }
        
        setIsOpen(false);
    };


    const handleDeleteNotification = async (e, notificationId) => {
        e.stopPropagation();
        try {
            await deleteNotification(notificationId);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const handleToggleRead = async (e, notification) => {
        e.stopPropagation();
        try {
            await toggleRead(notification.id);
        } catch (error) {
            console.error('Failed to toggle read status:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'error':
                return '❌';
            case 'info':
                return 'ℹ️';
            default:
                return '🔔';
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return '';
        }
    };


    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell */}
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                aria-label="Notifications"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Bell className="w-6 h-6 text-gray-600" />
                
                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span 
                        className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full animate-pulse"
                        role="status"
                        aria-label={`${unreadCount} unread notifications`}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div 
                    className="absolute -right-10 md:right-10 mt-2 w-65 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden ring-2 ring-gray-200/50"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="notification-menu"
                >
                    {/* Header */}
                    <div className="py-2 px-3 md:p-4 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">{t('notifications')}</h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleRefresh}
                                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                                    disabled={isRefreshing}
                                    aria-label="Refresh notifications"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {t('refresh')}
                                </button>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                                {unreadCount} {t('unread')} {t('notifications')}{unreadCount !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-96">
                        {loading && !isRefreshing ? (
                            <div className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                                <p className="mt-2 text-gray-500">{t('loading_notifications')}</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-12 h-12 text-gray-300 mx-auto" />
                                <p className="mt-2 text-gray-500">{t('no_notifications')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-300">
                                {notifications.slice(0, 10).map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-3 py-2 md:py-4 md:px-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                            !notification.read ? 'bg-blue-50' : ''
                                        }`}
                                        onClick={() => handleNotificationClick(notification)}
                                        role="menuitem"
                                    >
                                        <div className="flex items-start">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 mr-3">
                                                <span className="text-lg" aria-hidden="true">
                                                    {getNotificationIcon(notification.type)}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm md:text-base text-gray-900 truncate">
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                    {!notification.read && (
                                                        <span 
                                                            className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                                                            aria-label={t('unread')}
                                                        ></span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col ml-2 space-y-1">
                                                <button
                                                    onClick={(e) => handleToggleRead(e, notification)}
                                                    className="p-1 text-gray-400 hover:text-blue-600"
                                                    title={notification.read ? 'Mark as unread' : 'Mark as read'}
                                                    aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600"
                                                    title="Delete"
                                                    aria-label="Delete notification"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <a
                            href="/notification"
                            className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('view_all_notifications')}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationIcon;
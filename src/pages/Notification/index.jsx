import React, { useState } from 'react';
import { 
    Bell, 
    CheckCircle, 
    AlertTriangle, 
    Info, 
    XCircle, 
    Filter,
    Check,
    Trash2,
    Eye,
    EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import useNotifications from '../../hooks/useNotifications';
import Btn from '../../components/common/Button';

const NotificationsPage = () => {
    const {
        notifications,
        unreadCount,
        loading,
        error,
        pagination,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        toggleRead,
        loadMore,
        refresh
    } = useNotifications();

    const [filters, setFilters] = useState({
        unread: false,
        type: '',
        startDate: '',
        endDate: ''
    });

    const [selectedNotifications, setSelectedNotifications] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        fetchNotifications(1, newFilters);
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === notifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(notifications.map(n => n.id));
        }
    };

    const handleSelectNotification = (notificationId) => {
        setSelectedNotifications(prev =>
            prev.includes(notificationId)
                ? prev.filter(id => id !== notificationId)
                : [...prev, notificationId]
        );
    };

    const handleMarkSelectedAsRead = async () => {
        for (const id of selectedNotifications) {
            await markAsRead(id);
        }
        setSelectedNotifications([]);
    };

    const handleDeleteSelected = async () => {
        for (const id of selectedNotifications) {
            await deleteNotification(id);
        }
        setSelectedNotifications([]);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'info': 
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'error': return 'bg-red-50 border-red-200';
            case 'info': 
            default: return 'bg-blue-50 border-blue-200';
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading notifications...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-800">Error loading notifications</h2>
                    <p className="mt-2 text-gray-600">{error}</p>
                    <button
                        onClick={refresh}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
            <div className="mx-auto px-0 py-0 md:py-4 relative">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-slate-600">Notifications</h1>
                        <p className="mt-2 text-gray-600 text-sm md:text-base">
                            {unreadCount} unread • {notifications.length} total
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2">

                        <Btn onClick={refresh}>
                            Refresh
                        </Btn>
                        {unreadCount > 0 && (
                            <Btn onClick={markAllAsRead} type='primary'>
                            Mark all as read
                        </Btn>
                        )}
                    </div>
                </div>
                    {/* 
            
                <div className="flex flex-wrap items-center space-x-4">
                    <div className="flex items-center">
                        <Filter className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>
                    
                    <button
                        onClick={() => handleFilterChange('unread', !filters.unread)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            filters.unread
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Unread only
                    </button>

                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="">All types</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>

                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="From date"
                    />

                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                        placeholder="To date"
                    />

                    {(filters.unread || filters.type || filters.startDate || filters.endDate) && (
                        <button
                            onClick={() => {
                                setFilters({ unread: false, type: '', startDate: '', endDate: '' });
                                fetchNotifications(1);
                            }}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                        >
                            Clear filters
                        </button>
                    )}
                </div> */}

                {/* Bulk Actions */}
                {selectedNotifications.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between sticky top-10 bg-primary-200 rounded-xl py-2 px-1 my-2">
                        <span className="font-medium">
                            {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleMarkSelectedAsRead}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                                <Check className="w-4 h-4 inline mr-1" />
                                Mark as read
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                                <Trash2 className="w-4 h-4 inline mr-1" />
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Notifications List */}
                {notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <Bell className="w-16 h-16 text-gray-300 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications</h3>
                        <p className="mt-1 text-gray-500">
                            {filters.unread ? "You don't have any unread notifications." : "You don't have any notifications yet."}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`bg-white rounded-lg shadow border ${getTypeColor(notification.type)} ${
                                    !notification.read ? 'border-l-4 border-l-primary' : ''
                                }`}
                            >
                                <div className="p-2 md:p-4">
                                    <div className="flex items-start">
                                        {/* Checkbox for selection */}
                                        <div className='flex flex-col gap-3 items-center w-4 justify-center'>
                                            <input
                                                type="checkbox"
                                                checked={selectedNotifications.includes(notification.id)}
                                                onChange={() => handleSelectNotification(notification.id)}
                                                className="mt-1 md:mr-4"
                                            />
                                            
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                {getTypeIcon(notification.type)}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 ml-2 md:ml-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-medium text-gray-900">
                                                        {notification.title}
                                                    </h3>
                                                    <p className="font-mooli mt-1 text-sm text-gray-600">
                                                        {notification.message}
                                                    </p>
                                                    <p className="mt-2 text-xs text-gray-400">
                                                        {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                                                    </p>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex items-center justify-center flex-col gap-3 ml-2 md:ml-4">
                                                    <button
                                                        onClick={() => toggleRead(notification.id)}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {notification.read ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {pagination.hasMore && (
                    <div className="mt-8 text-center">
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>
    );
    };

    export default NotificationsPage;
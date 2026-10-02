import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    BellOff,
    Check,
    CheckCheck,
    CheckCircle2,
    AlertTriangle,
    Info,
    XCircle,
    Mail,
    MailOpen,
    RefreshCw,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import useNotifications from '../../hooks/useNotifications';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { getNotificationRedirectLink } from '../../utils/notifications';

/**
 * The full notification inbox.
 *
 * One bordered list with hairline dividers, grouped by day, rather than a stack of padded
 * cards. At the old density a phone screen held about three notifications. Now it holds
 * eight to ten, with the same information: what it is (icon), whether it is new (dot and
 * weight), what it says (two lines at most), and when (time on the row, day in the group
 * heading, full timestamp on hover).
 *
 * Row actions stay out of the way until they are wanted: on hover or keyboard focus on
 * desktop, always visible on touch screens, which have no hover.
 */

// Tints per notification type. The icon carries the type so the row itself stays neutral.
const TYPE_STYLE = {
    success: { Icon: CheckCircle2, className: 'bg-green-50 text-green-600' },
    warning: { Icon: AlertTriangle, className: 'bg-amber-50 text-amber-600' },
    error: { Icon: XCircle, className: 'bg-red-50 text-red-600' },
    info: { Icon: Info, className: 'bg-primary-50 text-primary-600' },
    system_common: { Icon: Bell, className: 'bg-slate-100 text-slate-600' },
};

// No header offset needed: <main> carries `pt-header`, and sticky insets are measured from
// inside that padding, so `top-0` already parks the toolbar right under the fixed header
// (the same as FlatDetails' sticky tabs). Adding the header height again left a gap.
const STICKY_TOP = 'top-[calc(env(safe-area-inset-top,0px))]';

const IconButton = ({ label, onClick, children, danger = false, disabled = false }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors disabled:opacity-40 ${
            danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'
        }`}
    >
        {children}
    </button>
);

const ToolbarButton = ({ onClick, children, danger = false, disabled = false }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
            danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'
        }`}
    >
        {children}
    </button>
);

/** A checkbox that can show "some selected". `indeterminate` has no HTML attribute; it is set on the node. */
const SelectAllBox = ({ checked, indeterminate, onChange, label }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            aria-label={label}
            title={label}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary-600"
        />
    );
};

const SkeletonRows = () => (
    <ul aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-1.5 h-4 w-4 rounded bg-slate-100" />
                <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-1/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-slate-100 animate-pulse" />
                </div>
            </li>
        ))}
    </ul>
);

const NotificationsPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dateLocale = i18n.language?.startsWith('bn') ? bnLocale : undefined;

    const {
        notifications,
        unreadCount,
        loading,
        isFetching,
        error,
        filters,
        pagination,
        counts,
        refresh,
        updateFilters,
        goToPage,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        toggleRead,
        selectedNotifications,
        selectNotification,
        selectAll,
        clearSelections,
        markSelectedAsRead,
        deleteSelected,
    } = useNotifications();

    const [confirmDelete, setConfirmDelete] = useState(false);

    const selectedCount = selectedNotifications.length;
    const allSelected = notifications.length > 0 && selectedCount === notifications.length;
    const showUnreadOnly = !!filters.unread;

    const setTab = (unread) => {
        if (unread === showUnreadOnly) return;
        clearSelections();
        updateFilters({ unread });
    };

    // Grouped by calendar day, newest first (the API already orders them).
    const groups = useMemo(() => {
        const out = [];
        for (const n of notifications) {
            const d = new Date(n.createdAt);
            const key = Number.isNaN(d.getTime()) ? 'unknown' : format(d, 'yyyy-MM-dd');
            let label;
            if (key === 'unknown') label = '';
            else if (isToday(d)) label = t('notif_today');
            else if (isYesterday(d)) label = t('notif_yesterday');
            else label = format(d, isThisYear(d) ? 'EEEE, d MMM' : 'd MMM yyyy', { locale: dateLocale });

            const last = out[out.length - 1];
            if (last && last.key === key) last.items.push(n);
            else out.push({ key, label, items: [n] });
        }
        return out;
    }, [notifications, t, dateLocale]);

    const openNotification = async (notification) => {
        if (!notification.read) markAsRead(notification.id);
        const link = getNotificationRedirectLink(notification);
        if (!link) return;
        if (link.startsWith('/')) navigate(link);
        else window.location.assign(link);
    };

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const total = pagination.total ?? counts.total ?? 0;
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="mx-auto w-full max-w-3xl py-2 md:py-4">
            {/* Header */}
            <div className="mb-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-slate-800 md:text-2xl">{t('notifications')}</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {unreadCount > 0 ? t('notif_unread_count', { count: unreadCount }) : t('notif_all_caught_up')}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {unreadCount > 0 && (
                        <ToolbarButton onClick={markAllAsRead}>
                            <CheckCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('mark_all_as_read')}</span>
                            <span className="sm:hidden">{t('notif_mark_all_read_short')}</span>
                        </ToolbarButton>
                    )}
                    <IconButton label={t('refresh')} onClick={refresh}>
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </IconButton>
                </div>
            </div>

            {/* overflow-clip, not overflow-hidden: hidden makes the card its own scroll
                container, and the sticky toolbar inside would then never stick. */}
            <div className="overflow-clip rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Toolbar: tabs normally, bulk actions while something is selected. Sticky, so
                    the bulk actions are still in reach after scrolling down to select. */}
                <div
                    className={`sticky ${STICKY_TOP} z-10 flex h-12 items-center gap-2 border-b border-slate-200 px-4 ${
                        selectedCount > 0 ? 'bg-primary-50' : 'bg-white'
                    }`}
                >
                    <SelectAllBox
                        checked={allSelected}
                        indeterminate={selectedCount > 0 && !allSelected}
                        onChange={selectAll}
                        label={t('notif_select_all')}
                    />

                    {selectedCount > 0 ? (
                        <>
                            <span className="ml-1 text-sm font-medium text-slate-800">
                                {t('notif_selected', { count: selectedCount })}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                                <ToolbarButton onClick={markSelectedAsRead}>
                                    <Check className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('mark_as_read')}</span>
                                </ToolbarButton>
                                <ToolbarButton danger onClick={() => setConfirmDelete(true)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t('delete')}</span>
                                </ToolbarButton>
                                <IconButton label={t('notif_clear_selection')} onClick={clearSelections}>
                                    <X className="h-4 w-4" />
                                </IconButton>
                            </div>
                        </>
                    ) : (
                        <div role="tablist" className="ml-1 flex items-center gap-1">
                            {[
                                { unread: false, label: t('all') },
                                { unread: true, label: t('unread'), badge: unreadCount },
                            ].map((tab) => {
                                const active = tab.unread === showUnreadOnly;
                                return (
                                    <button
                                        key={String(tab.unread)}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setTab(tab.unread)}
                                        className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                                            active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {tab.label}
                                        {tab.badge > 0 && (
                                            <span className="min-w-5 rounded-full bg-primary-500 px-1.5 text-center text-[11px] font-semibold leading-5 text-white tabular-nums">
                                                {tab.badge > 99 ? '99+' : tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Body */}
                {loading && notifications.length === 0 ? (
                    <SkeletonRows />
                ) : error && notifications.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
                        <p className="mt-3 text-sm font-medium text-slate-800">{t('error_loading_notifications')}</p>
                        <button
                            type="button"
                            onClick={refresh}
                            className="mt-3 text-sm font-medium text-primary-600 hover:underline"
                        >
                            {t('retry')}
                        </button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-4 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <BellOff className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-800">
                            {showUnreadOnly ? t('notif_all_caught_up') : t('no_notifications')}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {showUnreadOnly ? t('no_unread_notifications') : t('no_notifications_yet')}
                        </p>
                    </div>
                ) : (
                    <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
                        {groups.map((group) => (
                            <section key={group.key} aria-label={group.label || undefined}>
                                {group.label && (
                                    <h2 className="border-b border-slate-100 bg-slate-50/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                        {group.label}
                                    </h2>
                                )}
                                <ul className="divide-y divide-slate-100">
                                    {group.items.map((n) => {
                                        const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info;
                                        const { Icon } = style;
                                        const selected = selectedNotifications.includes(n.id);
                                        const date = new Date(n.createdAt);
                                        const validDate = !Number.isNaN(date.getTime());
                                        // Broadcasts are shared rows; the API does not let one
                                        // recipient delete or unread them for everybody.
                                        const personal = n.type !== 'system_common';

                                        return (
                                            <li
                                                key={n.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openNotification(n)}
                                                onKeyDown={(e) => {
                                                    if (e.target !== e.currentTarget) return;
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        openNotification(n);
                                                    }
                                                }}
                                                className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 outline-none transition-colors focus-visible:bg-slate-50 ${
                                                    selected ? 'bg-primary-50/60' : n.read ? 'hover:bg-slate-50' : 'bg-primary-50/25 hover:bg-primary-50/50'
                                                }`}
                                            >
                                                {/* Unread marker on the edge, so it reads before anything else. */}
                                                {!n.read && (
                                                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-primary-500" />
                                                )}

                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => selectNotification(n.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={n.title}
                                                    className="mt-2 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-primary-600"
                                                />

                                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                                                    <Icon className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <p
                                                            className={`truncate text-sm ${
                                                                n.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'
                                                            }`}
                                                        >
                                                            {n.title}
                                                        </p>
                                                        {!n.read && (
                                                            <span aria-label={t('unread')} className="h-1.5 w-1.5 shrink-0 -translate-y-0.5 rounded-full bg-primary-500" />
                                                        )}
                                                        <time
                                                            dateTime={validDate ? date.toISOString() : undefined}
                                                            title={validDate ? format(date, 'PPpp', { locale: dateLocale }) : undefined}
                                                            className="ml-auto shrink-0 text-xs text-slate-400 tabular-nums"
                                                        >
                                                            {validDate ? format(date, 'h:mm a', { locale: dateLocale }) : ''}
                                                        </time>
                                                    </div>
                                                    <p className={`mt-0.5 line-clamp-2 text-sm leading-snug ${n.read ? 'text-slate-500' : 'text-slate-600'}`}>
                                                        {n.message}
                                                    </p>
                                                </div>

                                                {personal && (
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="-my-1 flex shrink-0 items-center transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                                                    >
                                                        <IconButton
                                                            label={n.read ? t('notif_mark_unread') : t('mark_as_read')}
                                                            onClick={() => toggleRead(n.id)}
                                                        >
                                                            {n.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                                                        </IconButton>
                                                        <IconButton label={t('delete')} danger onClick={() => deleteNotification(n.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </IconButton>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}

                {/* Paging. The old "Load more" read `pagination.hasMore`, which the API never
                    sends (it sends hasNextPage), so it never appeared and nothing past the
                    first 20 notifications could be reached. */}
                {total > limit && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                        <span className="tabular-nums">{t('notif_range', { from, to, total })}</span>
                        <div className="flex items-center gap-1">
                            <ToolbarButton disabled={page <= 1 || isFetching} onClick={() => goToPage(page - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('notif_newer')}</span>
                            </ToolbarButton>
                            <ToolbarButton disabled={!pagination.hasNextPage || isFetching} onClick={() => goToPage(page + 1)}>
                                <span className="hidden sm:inline">{t('notif_older')}</span>
                                <ChevronRight className="h-4 w-4" />
                            </ToolbarButton>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    setConfirmDelete(false);
                    await deleteSelected();
                }}
                title={t('notif_delete_title')}
                message={t('notif_delete_confirm', { count: selectedCount })}
                confirmText={t('delete')}
                variant="danger"
            />
        </div>
    );
};

export default NotificationsPage;

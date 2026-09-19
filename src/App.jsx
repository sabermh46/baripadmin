import React, { useEffect, useState, useCallback } from 'react';
import { baseApi } from './store/api/baseApi';
import { tagsForPush } from './store/notificationTags';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAppDispatch } from './hooks';
import { setOnlineStatus } from './store/slices/uiSlice';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ContentLoader } from './components/common/RouteLoader.jsx';
import { AuthInitializer } from './components/common/AuthInitializer.jsx';
import usePushNotifications from './hooks/usePushNotifications.js';
import { useVersionCheck } from './hooks/useVersionCheck.js';
import { useTranslation } from 'react-i18next';
import usePwaInstall from './hooks/usePwaInstall.js';
import IosInstallGuide from './components/common/IosInstallGuide.jsx';

const PwaInstallPrompt = () => {
    const [isVisible, setIsVisible] = useState(true);
    const { t } = useTranslation();
    // iOS gets the same banner: it has no install event to wait for, so `canInstall` is true
    // there from the start and Install opens the Add to Home Screen walkthrough instead.
    const { canInstall, isIos, install, guideOpen, closeGuide } = usePwaInstall();

    const handleInstall = useCallback(async () => {
        await install();
        // The iOS guide has to stay on screen after the banner goes, so it is rendered
        // outside the `isVisible` branch below.
        setIsVisible(false);
    }, [install]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        localStorage.setItem('installPromptDismissed', 'true');
    }, []);

    const showBanner =
        canInstall && isVisible && localStorage.getItem('installPromptDismissed') !== 'true';

    if (!showBanner) return isIos ? <IosInstallGuide open={guideOpen} onClose={closeGuide} /> : null;

    return (
      <>
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white rounded-xl shadow-2xl z-[1000] transition-all duration-300 ease-out">
            <div className="flex items-center p-4 gap-4 sm:flex-row sm:text-left flex-col text-center">
                <div className="text-3xl">📱</div>

                <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-lg">{t('install_our_app')}</h4>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleInstall}
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 font-medium transition-colors"
                    >
                        {t('install')}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-primary-600 border border-primary-600 hover:bg-primary-50 transition-colors"
                    >
                        {t('dismiss')}
                    </button>
                </div>
            </div>
        </div>
        {isIos && <IosInstallGuide open={guideOpen} onClose={closeGuide} />}
      </>
    );
};

const AppContent = () => {
    const dispatch = useAppDispatch();

    // Single instance — handles auto-subscribe after login and state tracking.
    usePushNotifications();
    // Polls /api/version and toasts when the deployed version differs from this bundle.
    // This is the app's only "new version available" prompt now: a second, service-worker
    // driven banner used to live in this component, but with vite-plugin-pwa's
    // `registerType: 'autoUpdate'` the worker installs and activates on its own, so that
    // banner's "Update now" button was competing with this toast to say the same thing.
    useVersionCheck();

    // Network status
    useEffect(() => {
        const handleOnline = () => dispatch(setOnlineStatus(true));
        const handleOffline = () => dispatch(setOnlineStatus(false));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [dispatch]);

    /**
     * Notification fan-in.
     *
     * Four different sources can tell this tab that notifications changed: a postMessage
     * from the service worker's push handler, a BroadcastChannel message from another tab,
     * a `storage` event (also cross-tab), and the tab regaining visibility. Each used to
     * carry its own copy of the same isRefreshing/setTimeout debounce block; they are one
     * `triggerRefresh` now.
     *
     * Registration of the worker itself is not here any more — vite-plugin-pwa injects it.
     * This component also registered '/sw.js' directly, and index.html registered it a
     * third time inline.
     */
    useEffect(() => {
        let isRefreshing = false;
        let refreshTimeout = null;

        const triggerRefresh = ({ withAlert = false } = {}) => {
            if (isRefreshing) return;
            isRefreshing = true;

            if (withAlert) {
                if (navigator.vibrate) navigator.vibrate([100]);

                try {
                    const audio = new Audio('/notification.mp3');
                    audio.volume = 0.7;
                    audio.play().catch(() => {});
                } catch {
                    // autoplay blocked or unsupported — the visual notification is enough
                }
            }

            window.dispatchEvent(new CustomEvent('refreshNotifications'));

            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => {
                isRefreshing = false;
            }, 1000);
        };

        const handleServiceWorkerMessage = (event) => {
            const type = event.data?.type;

            if (type === 'NEW_NOTIFICATION') {
                window.dispatchEvent(new CustomEvent('notificationReceived', { detail: event.data }));
                // The notification and the data it is about arrive through different doors.
                // Refreshing only the notification list is why someone could be told a house
                // was created and then open Houses to the previous list: the push updated the
                // bell, and every other cache carried on serving whatever it last fetched.
                //
                // This was hardcoded to ['AppFeePayments'] — correct for the one screen it
                // was written for and silent about every other. The server names what changed
                // and notificationTags maps that to caches, so a notification about a house
                // now refreshes houses, one about a caretaker refreshes caretakers, and an
                // unannotated one falls back to a broad sweep rather than doing nothing.
                dispatch(baseApi.util.invalidateTags(tagsForPush(event.data?.data)));
                // Lets other open tabs know without each needing its own push delivery.
                try {
                    localStorage.setItem('notification_update', Date.now().toString());
                } catch {
                    // storage disabled — cross-tab sync degrades, this tab still updates
                }
                triggerRefresh({ withAlert: true });
            } else if (type === 'REFRESH_NOTIFICATIONS') {
                triggerRefresh();
            }
        };

        // Cross-tab wake-ups carry no payload — the tab that received the push already
        // invalidated precisely; this one only knows that something changed, so it sweeps.
        const handleStorageChange = (event) => {
            if (event.key === 'notification_update') {
                dispatch(baseApi.util.invalidateTags(tagsForPush()));
                triggerRefresh();
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) triggerRefresh();
        };

        let broadcastChannel = null;
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                broadcastChannel = new BroadcastChannel('notifications');
                broadcastChannel.onmessage = (event) => {
                    if (event.data?.type === 'NEW_NOTIFICATION') {
                        window.dispatchEvent(new CustomEvent('notificationReceived', { detail: event.data }));
                        triggerRefresh();
                    }
                };
            } catch {
                // not available in this browser — the storage event covers cross-tab sync
            }
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            broadcastChannel?.close();
            clearTimeout(refreshTimeout);
        };
    }, [dispatch]);

    useEffect(() => {
        window.history.scrollRestoration = 'manual';
    }, []);

    return (
        <>
            <AuthInitializer />
            <AppRoutes />

            <PwaInstallPrompt />

            <ToastContainer
                position="bottom-center"
                autoClose={5000}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </>
    );
};

const App = () => {
    return (
        <Provider store={store}>
            <PersistGate loading={<ContentLoader />} persistor={persistor}>
                <Router>
                    <AppContent />
                </Router>
            </PersistGate>
        </Provider>
    );
};

export default App;

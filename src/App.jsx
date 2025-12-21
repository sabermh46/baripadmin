import React, { useEffect, useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { BrowserRouter as Router } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks'; 
import { setOnlineStatus, setDeferredPrompt, setUpdateAvailable, clearDeferredPrompt } from './store/slices/uiSlice';
import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import nProgress from 'nprogress';
import RouteLoader, { LoaderMinimal } from './components/common/RouteLoader.jsx';
import usePushNotifications from './hooks/usePushNotifications.js';
import NotificationButton from './NotificationButton.jsx';

nProgress.configure({
    minimum: 0.3,
    showSpinner: false,
    speed: 400,
    trickleSpeed: 200,
    easing: 'ease',
});

// 1. The global variable remains here (module-scoped)
let globalDeferredPrompt = null;

// --- START: Integrated InstallPrompt Component ---
const PwaInstallPrompt = ({ isPromptAvailable }) => {
    const dispatch = useAppDispatch();
    const [isVisible, setIsVisible] = useState(true);

    const handleInstall = useCallback(async () => {
        // Access globalDeferredPrompt directly from the closure scope
        const promptEvent = globalDeferredPrompt; 
        
        if (!promptEvent) {
            console.error("Install prompt event object is missing.");
            return;
        }
        
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // Clear the global variable and the Redux flag
        globalDeferredPrompt = null; 
        dispatch(clearDeferredPrompt()); // Clears the Redux boolean flag
        setIsVisible(false);
    }, [dispatch]);

    const handleDismiss = useCallback(() => {
        // Clear the global variable and the Redux flag upon dismissal
        globalDeferredPrompt = null;
        dispatch(clearDeferredPrompt());
        setIsVisible(false);
        localStorage.setItem('installPromptDismissed', 'true');
    }, [dispatch]);

    // Check visibility using the Redux flag instead of the object itself
    if (!isPromptAvailable || !isVisible) return null;
    if (localStorage.getItem('installPromptDismissed') === 'true') return null;

    return (
        <div 
            className="
                fixed bottom-5 left-1/2 -translate-x-1/2 
                w-[90%] max-w-lg bg-white 
                rounded-xl shadow-2xl z-[1000] 
                transition-all duration-300 ease-out
            "
        >
            <div 
                className="
                    flex items-center p-4 gap-4 
                    sm:flex-row sm:text-left 
                    flex-col text-center
                "
            >
                <div className="text-3xl">
                    📱
                </div>
                
                <div className="flex-1">
                    <h4 className="mb-1 font-semibold text-lg">
                        Install Barip App
                    </h4>
                    <p className="text-sm text-gray-600">
                        Install the app for a better experience with offline access
                    </p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleInstall} 
                        className="
                            flex-1 px-4 py-2 rounded-lg text-white 
                            bg-blue-600 hover:bg-blue-700 
                            font-medium transition-colors
                        "
                    >
                        Install
                    </button>
                    <button 
                        onClick={handleDismiss} 
                        className="
                            flex-1 px-4 py-2 rounded-lg font-medium 
                            text-blue-600 border border-blue-600 
                            hover:bg-blue-50 transition-colors
                        "
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- END: Integrated InstallPrompt Component ---


const AppContent = () => {
    const dispatch = useAppDispatch();
    const { updateAvailable, deferredPrompt: isPromptAvailable } = useAppSelector(state => state.ui);
    const { user } = useAppSelector(state => state.auth);

    const { 
        isSupported, 
        permission, 
        isSubscribed, 
        toggleSubscription,
        subscribe 
    } = usePushNotifications();

    // Network status
    useEffect(() => {
        // ... (Network status useEffect remains the same)
        const handleOnline = () => dispatch(setOnlineStatus(true));
        const handleOffline = () => dispatch(setOnlineStatus(false));
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [dispatch]);


    // PWA install prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            // 1. STORE the non-serializable event object locally
            globalDeferredPrompt = e; 

            // 2. DISPATCH a simple serializable value (true) to Redux
            dispatch(setDeferredPrompt(true)); 
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [dispatch]);

    // Service worker update
    useEffect(() => {
        // ... (Service worker update useEffect remains the same)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                registration.addEventListener('updatefound', ()=> {
                    const newWorker = registration.installing;
                    if(newWorker) {
                        newWorker.addEventListener('statechange', ()=> {
                            if(newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                dispatch(setUpdateAvailable(true));
                            }
                        })
                    }
                })
            })
        }
    }, [dispatch])

    // In AppContent component - FIXED VERSION
    useEffect(() => {
        // ... (Real-time updates useEffect remains the same)
        let isRefreshing = false;
        let refreshTimeout = null;

        const handleServiceWorkerMessage = (event) => {
            console.log('Frontend received message:', event.data);
            
            if (event.data && event.data.type === 'NEW_NOTIFICATION') {
                console.log('New push notification received!');
                
                if (!isRefreshing) {
                    isRefreshing = true;
                    
                    if (navigator.vibrate) {
                        navigator.vibrate([100]); 
                    }
                    
                    window.dispatchEvent(new CustomEvent('notificationReceived', {
                        detail: event.data
                    }));
                    
                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                    
                    localStorage.setItem('notification_update', Date.now().toString());
                    
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.volume = 0.7;
                        audio.play().catch(e => console.log('Could not play sound:', e));
                    } catch (e) {
                        console.log('No notification sound');
                    }
                    
                    refreshTimeout = setTimeout(() => {
                        isRefreshing = false;
                    }, 1000);
                }
            }
            
            if (event.data && event.data.type === 'REFRESH_NOTIFICATIONS') {
                console.log('Refresh requested from service worker');
                
                if (!isRefreshing) {
                    isRefreshing = true;
                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                    
                    refreshTimeout = setTimeout(() => {
                        isRefreshing = false;
                    }, 1000);
                }
            }
            
            if (event.data && event.data.type === 'UPDATE_LOCALSTORAGE') {
                console.log('Updating localStorage from service worker');
                localStorage.setItem(event.data.key, event.data.value);
            }
        };

        // ... (BroadcastChannel, storage, visibility, cleanup logic remains the same)
        let broadcastChannel = null;
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                broadcastChannel = new BroadcastChannel('notifications');
                broadcastChannel.onmessage = (event) => {
                    console.log('BroadcastChannel message:', event.data);
                    if (event.data.type === 'NEW_NOTIFICATION' && !isRefreshing) {
                        isRefreshing = true;
                        window.dispatchEvent(new CustomEvent('notificationReceived', {
                            detail: event.data
                        }));
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));
                        
                        refreshTimeout = setTimeout(() => {
                            isRefreshing = false;
                        }, 1000);
                    }
                };
            } catch (error) {
                console.log('BroadcastChannel not available:', error);
            }
        }

        let storageTimeout = null;
        const handleStorageChange = (event) => {
            if (event.key === 'notification_update') {
                console.log('Storage change detected - refreshing notifications');
                
                if (storageTimeout) {
                    clearTimeout(storageTimeout);
                }
                
                storageTimeout = setTimeout(() => {
                    if (!isRefreshing) {
                        isRefreshing = true;
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));
                        
                        setTimeout(() => {
                            isRefreshing = false;
                        }, 1000);
                    }
                }, 100);
            }
        };

        const handleControllerChange = () => {
            console.log('Service worker controller changed');
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        }

        window.addEventListener('storage', handleStorageChange);
        
        let visibilityTimeout = null;
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Page became visible');
                
                if (visibilityTimeout) {
                    clearTimeout(visibilityTimeout);
                }
                
                visibilityTimeout = setTimeout(() => {
                    if (!isRefreshing) {
                        isRefreshing = true;
                        window.dispatchEvent(new CustomEvent('refreshNotifications'));
                        
                        setTimeout(() => {
                            isRefreshing = false;
                        }, 1000);
                    }
                }, 500);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            }
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (broadcastChannel) {
                broadcastChannel.close();
            }
            
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            
            if (storageTimeout) {
                clearTimeout(storageTimeout);
            }
            
            if (visibilityTimeout) {
                clearTimeout(visibilityTimeout);
            }
        };
    }, [dispatch]);


    console.log(user, isSupported, permission, isSubscribed);
    return (
        <>

            <RouteLoader />
            <AppRoutes />

            {
                user?.email && <NotificationButton />
            }

            {/* 3. Render the integrated component, passing the Redux flag */}
            <PwaInstallPrompt isPromptAvailable={isPromptAvailable} />
            
            <ToastContainer position="bottom-center" autoClose={5000} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            {updateAvailable && (
                <div className="fixed bottom-4 left-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg z-50 flex justify-between items-center">
                    <p className="font-semibold">New version available!</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-white text-yellow-600 px-4 py-2 rounded font-bold hover:bg-gray-100"
                    >
                        Update Now
                    </button>
                </div>
            )}
        </>
    );
};

const App = () => {
    return (
        <Provider store={store}>
            <PersistGate loading={<LoaderMinimal />} persistor={persistor}>
                <Router>
                    <AppContent />
                </Router>
            </PersistGate>
        </Provider>
    );
};

export default App;
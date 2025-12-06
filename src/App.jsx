
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { BrowserRouter as Router } from 'react-router-dom';
// Assuming hooks are already defined in JS versions
import { useAppDispatch, useAppSelector } from './hooks'; 
import { setOnlineStatus, setDeferredPrompt, setUpdateAvailable } from './store/slices/uiSlice';
import AppRoutes from './routes/AppRoutes';
import InstallPrompt from './components/InstallPrompt.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import nProgress from 'nprogress';
import RouteLoader from './components/common/RouteLoader.jsx';
import axios from 'axios';
import usePushNotifications from './hooks/usePushNotifications.js';

nProgress.configure({
  minimum: 0.3,
  showSpinner: false,
  speed: 400,
  trickleSpeed: 200,
  easing: 'ease',
})

const AppContent = () => {
  const dispatch = useAppDispatch();
  const { updateAvailable } = useAppSelector(state => state.ui);
  const { user } = useAppSelector(state => state.auth);

  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    toggleSubscription
  } = usePushNotifications();

  

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


  // PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      dispatch(setDeferredPrompt(e));
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };

  }, [dispatch]);

  // Service worker update
  useEffect(() => {
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
  // Track if we're already handling a refresh to prevent loops
  let isRefreshing = false;
  let refreshTimeout = null;

  const handleServiceWorkerMessage = (event) => {
    console.log('Frontend received message:', event.data);
    
    if (event.data && event.data.type === 'NEW_NOTIFICATION') {
      console.log('New push notification received!');
      
      // Debounce refresh to prevent multiple rapid refreshes
      if (!isRefreshing) {
        isRefreshing = true;
        
        // Show a subtle indicator (optional)
        if (navigator.vibrate) {
          navigator.vibrate([100]); // Short vibration
        }
        
        // Dispatch event for hooks to listen to
        window.dispatchEvent(new CustomEvent('notificationReceived', {
          detail: event.data
        }));
        
        // Force immediate refresh
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        
        // Update localStorage for cross-tab sync
        localStorage.setItem('notification_update', Date.now().toString());
        
        // Play notification sound (optional)
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Could not play sound:', e));
        } catch (e) {
          console.log('No notification sound');
        }
        
        // Reset refreshing flag after a delay
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

  // Set up BroadcastChannel for cross-tab communication
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

  // Listen for localStorage changes from other tabs with debounce
  let storageTimeout = null;
  const handleStorageChange = (event) => {
    if (event.key === 'notification_update') {
      console.log('Storage change detected - refreshing notifications');
      
      // Debounce storage changes
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
      // Don't automatically refresh on controller change
      // This was causing the infinite loop
    };

  // Set up message listeners
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // REMOVED or MODIFIED controllerchange listener - this was causing the loop
    // If you need to handle controller changes, do it differently
    
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  }

  window.addEventListener('storage', handleStorageChange);
  
  // Also listen for page visibility changes - with debounce
  let visibilityTimeout = null;
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('Page became visible');
      
      // Debounce visibility changes
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

  // Cleanup
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
}, []);


  console.log(user, isSupported, permission, isSubscribed);
  return (
    <>

      <RouteLoader />
      <AppRoutes />

      {
        user && isSupported && permission === 'granted' ? (
          <div className='fixed bottom-4 right-4 z-50'>
            <button
            className={`px-4 py-2 rounded-lg shadow-lg ${
              isSubscribed 
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600' 
            }`}
            onClick={toggleSubscription}>
              {isSubscribed ? '🔕 Disable Notifications' : '🔔 Enable Notifications'}
            </button>
          </div>
        ) : (
          <button
            onClick={()=>{
              Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
              })
            }}
          >
            enable notifications
          </button>
        )
      }

      <InstallPrompt />
      <ToastContainer position="top-right" autoClose={5000} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
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
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <Router>
          <AppContent />
        </Router>
      </PersistGate>
    </Provider>
  );
};

export default App;
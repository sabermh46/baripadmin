import { createSlice } from '@reduxjs/toolkit';


const initialState = {
  notifications: [],
  newNotificationCount: 0,
  // navigator is safe to access here in browser environment
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  serviceWorker: null,
  updateAvailable: false,
  deferredPrompt: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
      };
      
      state.notifications.unshift(notification);
      state.newNotificationCount += 1;
      
      // Show notification if PWA is installed (check existence for server rendering safety)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const options = {
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
          data: notification.data,
        };
        
        new Notification(notification.title, options);
      }
    },
    
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.newNotificationCount -= 1;
      }
    },
    
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    
    setServiceWorker: (state, action) => {
      state.serviceWorker = action.payload;
    },
    
    setUpdateAvailable: (state, action) => {
      state.updateAvailable = action.payload;
    },
    
    setDeferredPrompt: (state, action) => {
      state.deferredPrompt = action.payload;
    },
    
    clearDeferredPrompt: (state) => {
      state.deferredPrompt = null;
    },
    
    resetNewNotificationCount: (state) => {
      state.newNotificationCount = 0;
    },
  },
});

export const {
  addNotification,
  markNotificationAsRead,
  setOnlineStatus,
  setServiceWorker,
  setUpdateAvailable,
  setDeferredPrompt,
  clearDeferredPrompt,
  resetNewNotificationCount,
} = uiSlice.actions;

export default uiSlice.reducer;
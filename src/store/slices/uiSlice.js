import { createSlice } from '@reduxjs/toolkit';


const initialState = {
  notifications: [],
  newNotificationCount: 0,
  // navigator is safe to access here in browser environment
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  serviceWorker: null,
  updateAvailable: false,
  deferredPrompt: null,

  /**
   * How the flat list is laid out on the house detail page.
   *
   * Lives in the ui slice because that slice is persisted (see store/index.js whitelist),
   * so the choice survives a reload and a return visit — a layout preference the user set
   * once should not reset every time they open a house.
   *
   * 'comfortable' = wide cards, 'compact' = dense cards, 'list' = one row each.
   */
  flatViewMode: 'comfortable',

  /**
   * Set when the API answers 402 SUBSCRIPTION_EXPIRED.
   *
   * The gate has always returned that code and the client had no idea what it meant, so a
   * blocked owner got a red toast on every screen they opened and a page of empty widgets
   * behind it — the app looked broken rather than locked. Recording it once, centrally,
   * lets the layout say so plainly and point at the way out.
   *
   * Deliberately NOT persisted (see the whitelist in store/index.js): it is a fact about
   * the last response, not a preference, and a stale `true` in localStorage would lock a
   * paid-up owner out of their own app until something happened to clear it.
   */
  subscriptionBlocked: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFlatViewMode: (state, action) => {
      state.flatViewMode = action.payload;
    },

    setSubscriptionBlocked: (state, action) => {
      state.subscriptionBlocked = !!action.payload;
    },

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
  setFlatViewMode,
  setSubscriptionBlocked,
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
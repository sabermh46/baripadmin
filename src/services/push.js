class PushService {
  constructor() {
    // Get VAPID public key from environment
    this.publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    this.isSupported = 'PushManager' in window && 'serviceWorker' in navigator;
  }

  // Convert VAPID key from base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe user to push notifications
  async subscribeUser() {
  if (!this.isSupported) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    console.log('🔑 VAPID Public Key (first 20 chars):', this.publicKey?.substring(0, 20) + '...');
    
    // 1. Check service worker
    if (!navigator.serviceWorker.controller) {
      console.error('Service worker not controlling page. Hard refresh required.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service worker ready');
    
    // 2. Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('📋 Already subscribed:', subscription.endpoint);
      return subscription;
    }

    // 3. Convert VAPID key
    const applicationServerKey = this.urlBase64ToUint8Array(this.publicKey);
    console.log('📦 ApplicationServerKey length:', applicationServerKey.length);

    // 4. Try to subscribe
    console.log('🔄 Attempting push subscription...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('✅ Subscription created:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      keys: Object.keys(subscription.toJSON().keys)
    });

    // 5. Send to backend via axiosInstance (auth header injected automatically)
    console.log('📤 Sending subscription to backend...');
    const { axiosInstance } = await import('../store/api/baseApi.js');
    const { data } = await axiosInstance.post('/push/subscribe', {
      subscription: subscription.toJSON()
    });
    console.log('✅ Subscription saved to server:', data);
    
    return subscription;
  } catch (error) {
    console.error('❌ Detailed push subscription error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Specific error handling
    if (error.name === 'AbortError') {
      console.error('🔧 Possible causes:');
      console.error('1. Invalid VAPID key format');
      console.error('2. HTTPS required (localhost is OK)');
      console.error('3. Browser push service error');
      console.error('4. Incorrect VAPID key generation');
    }
    
    return null;
  }
}

  // Unsubscribe user from push notifications
  async unsubscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();

        // Notify backend
        const { axiosInstance } = await import('../store/api/baseApi.js');
        await axiosInstance.post('/push/unsubscribe', { endpoint: subscription.endpoint });
        
        console.log('Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
    }
  }

  // Send test notification
  async sendTest() {
    try {
      const { axiosInstance } = await import('../store/api/baseApi.js');
      const { data } = await axiosInstance.post('/notifications/test');
      return data;
    } catch (error) {
      console.error('Test notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Check subscription status
  async getSubscriptionStatus() {
    if (!this.isSupported) return 'unsupported';
    
    const permission = Notification.permission;
    if (permission === 'denied') return 'blocked';
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (permission === 'granted') {
        return subscription ? 'subscribed' : 'not_subscribed';
      }
      
      return 'pending';
    } catch (error) {
      return 'error';
    }
  }
}

// Create and export a single instance
const pushService = new PushService();
export default pushService;
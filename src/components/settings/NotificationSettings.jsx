import React from 'react';
import { useAppSelector } from '../../hooks';
import usePushNotifications from '../../hooks/usePushNotifications';
import axios from 'axios';

const NotificationSettings = () => {
  const { token } = useAppSelector(state => state.auth);
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    toggleSubscription,
    subscription
  } = usePushNotifications();

  const [subscriptions, setSubscriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_APP_API_URL}/push/subscriptions`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setSubscriptions(response.data.subscriptions);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${import.meta.env.VITE_APP_API_URL}/push/test`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      alert('Test notification sent! Check your notifications.');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      alert('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchSubscriptions();
    }
  }, [token]);

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800">Push Notifications Not Supported</h3>
        <p className="text-yellow-700">
          Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Push Notification Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? 'You are subscribed to receive push notifications' 
                  : 'Enable to receive push notifications'}
              </p>
            </div>
            <button
              onClick={toggleSubscription}
              disabled={permission === 'denied'}
              className={`px-4 py-2 rounded-md font-medium ${
                isSubscribed
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </button>
          </div>

          {permission === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700 text-sm">
                ❌ Notifications are blocked in your browser settings. 
                Please enable them in your browser to receive notifications.
              </p>
            </div>
          )}

          {isSubscribed && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-700 text-sm">
                ✅ You are subscribed to push notifications. You will receive alerts for important updates.
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Your Devices</h4>
            {subscriptions.length > 0 ? (
              <ul className="space-y-2">
                {subscriptions.map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">
                        {sub.clientType === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Added: {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      Last used: {new Date(sub.lastUsed).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No active devices found.</p>
            )}
          </div>

          <div className="border-t pt-4">
            <button
              onClick={sendTestNotification}
              disabled={loading || !isSubscribed}
              className={`px-4 py-2 bg-blue-100 text-blue-700 rounded-md font-medium hover:bg-blue-200 ${
                loading || !isSubscribed ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Sending...' : 'Send Test Notification'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Send a test notification to verify everything is working correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
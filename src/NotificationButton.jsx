// Push notifications disabled — doesn't work on cPanel (outbound FCM connections blocked)
// Uncomment to re-enable when running on a server with unrestricted outbound connections.

// import React, { useEffect } from 'react';
// import usePushNotifications from './hooks/usePushNotifications';
// import { useAuth } from './hooks';

// const NotificationButton = () => {
//     const { isSupported, permission, isSubscribed, toggleSubscription, subscribe } = usePushNotifications();
//     const { user } = useAuth();
//
//     useEffect(() => {
//         if (isSupported && permission === 'granted' && !isSubscribed) {
//             const timer = setTimeout(() => { subscribe(); }, 1000);
//             return () => clearTimeout(timer);
//         }
//     }, [isSupported, permission, isSubscribed, subscribe]);
//
//     return <></>;
// };

const NotificationButton = () => null;
export default NotificationButton;

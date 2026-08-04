// Not rendered anywhere — subscription now happens automatically on login via
// usePushNotifications() itself (called directly in App.jsx), not through a manual button.
// This is kept only as a placeholder if a manual enable/disable toggle is wanted later.

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

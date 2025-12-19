// In your component
import React, { useEffect } from 'react';
import usePushNotifications from './hooks/usePushNotifications';
import { useAuth } from './hooks';

const NotificationButton = () => {
    const { 
        isSupported, 
        permission, 
        isSubscribed, 
        toggleSubscription,
        subscribe 
    } = usePushNotifications();

    const { user } = useAuth()
    
    // Auto-subscribe on mount if permission is already granted
    useEffect(() => {
        if (isSupported && permission === 'granted' && !isSubscribed) {
            // Delay slightly to avoid race conditions
            const timer = setTimeout(() => {
                subscribe();
            }, 1000);
            
            return () => clearTimeout(timer);
        }
    }, [isSupported, permission, isSubscribed, subscribe]);

    return user?.email && (
        <div className='fixed bottom-4 right-4 z-50'>
            {isSupported && permission !== 'granted' && !isSubscribed && (
                <button 
                    className='px-4 cursor-pointer py-2 rounded-lg shadow-lg bg-primary text-black capitalize hover:bg-primary-800 hover:text-white duration-200'
                    onClick={() => {
                        Notification.requestPermission().then(permission => {
                            if (permission === 'granted') {
                                toggleSubscription();
                            }
                        });
                    }}
                >
                    {'enable notifications'}
                </button>
            )}
        </div>
    );
};

export default NotificationButton;
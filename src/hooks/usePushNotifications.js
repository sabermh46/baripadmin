import { useCallback, useEffect, useState, useRef } from "react";
import { useAppSelector } from ".";
import { toast } from "react-toastify";
import axios from "axios";

const usePushNotifications = () => {
    const { user } = useAppSelector(state => state.auth);
    const token = localStorage.getItem('accessToken');
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Use refs to prevent infinite loops
    const initStartedRef = useRef(false);
    const permissionRef = useRef(permission);
    const isSubscribedRef = useRef(isSubscribed);

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    // Update refs when state changes
    useEffect(() => {
        permissionRef.current = permission;
    }, [permission]);

    useEffect(() => {
        isSubscribedRef.current = isSubscribed;
    }, [isSubscribed]);

    useEffect(() => {
        const checkSupport = () => {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window;
            setIsSupported(supported);

            if (supported) {
                const currentPermission = Notification.permission;
                setPermission(currentPermission);
                permissionRef.current = currentPermission;
            }
        };

        checkSupport();
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    };

    const registerServiceWorker = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service worker registered: ', registration);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            toast.error('Failed to register service worker');
            throw error;
        }
    }, []);

    // Check existing subscription
    const checkExistingSubscription = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSubscription = await registration.pushManager.getSubscription();

            if (existingSubscription) {
                setSubscription(existingSubscription);
                setIsSubscribed(true);
                isSubscribedRef.current = true;
                return existingSubscription;
            }

            return null;
        } catch (error) {
            console.error('Error checking existing subscription:', error);
            return null;
        }
    }, []);

    const subscribe = useCallback(async () => {
        if (!isSupported) {
            toast.error('Push notifications are not supported in this browser.');
            return false;
        }
        if (permissionRef.current === 'denied') {
            toast.error('Push notification permission was denied.');
            return false;
        }

        try {
            let notificationPermission = permissionRef.current;
            if (notificationPermission === 'default') {
                notificationPermission = await Notification.requestPermission();
                setPermission(notificationPermission);
                permissionRef.current = notificationPermission;
            }

            if (notificationPermission !== 'granted') {
                toast.error('Push notification permission was denied.');
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Convert subscription to sendable format
            const subscriptionData = {
                endpoint: newSubscription.endpoint,
                expirationTime: newSubscription.expirationTime,
                keys: {
                    p256dh: newSubscription.getKey ? 
                        btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('p256dh')))) :
                        newSubscription.keys.p256dh,
                    auth: newSubscription.getKey ? 
                        btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('auth')))) :
                        newSubscription.keys.auth
                }
            };

            const response = await axios.post(
                `${import.meta.env.VITE_APP_API_URL}/push/subscribe`, // Note: /api/push
                subscriptionData, // Send directly, not wrapped
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Subscription response:', response.data);

            setSubscription(newSubscription);
            setIsSubscribed(true);
            isSubscribedRef.current = true;
            toast.success('Subscribed to push notifications successfully.');
            return true;
        } catch (error) {
            console.error('Subscription error:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
            }
            toast.error('Failed to subscribe to notifications');
            return false;
        }
    }, [isSupported, publicKey, token]);

    const unsubscribe = useCallback(async () => {
        if (!subscription) return false;

        try {
            await subscription.unsubscribe();

            await axios.post(
                `${import.meta.env.VITE_APP_API_URL}/push/unsubscribe`,
                { endpoint: subscription.endpoint },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setSubscription(null);
            setIsSubscribed(false);
            isSubscribedRef.current = false;

            toast.success('Unsubscribed from push notifications.');
            return true;
        } catch (error) {
            console.error('Unsubscription error:', error);
            toast.error('Failed to unsubscribe from notifications');
            return false;
        }
    }, [subscription, token]);

    const toggleSubscription = useCallback(async () => {
        if (isSubscribedRef.current) {
            return await unsubscribe();
        } else {
            return await subscribe();
        }
    }, [subscribe, unsubscribe]);

    // Initialize only once when user logs in
    useEffect(() => {
        if (user && token && isSupported && !isInitialized && !initStartedRef.current) {
            console.log('Initializing push notifications...');
            initStartedRef.current = true;

            const init = async () => {
                try {
                    // First, register service worker
                    await registerServiceWorker();
                    
                    // Check if already subscribed
                    const existingSub = await checkExistingSubscription();
                    
                    // Only auto-subscribe if not already subscribed AND permission is granted
                    if (!existingSub && permissionRef.current === 'granted') {
                        console.log('Auto-subscribing...');
                        await subscribe();
                    } else if (existingSub) {
                        console.log('Already subscribed:', existingSub.endpoint);
                    } else {
                        console.log('Not auto-subscribing. Permission:', permissionRef.current);
                    }
                    
                    setIsInitialized(true);
                } catch (error) {
                    console.error('Push notification initialization error:', error);
                    initStartedRef.current = false; // Reset to allow retry
                }
            };

            init();
        }
    }, [user, token, isSupported, isInitialized, registerServiceWorker, checkExistingSubscription, subscribe]);

    // Cleanup on logout
    useEffect(() => {
        if (!user && subscription) {
            unsubscribe();
        }
    }, [user, subscription, unsubscribe]);

    // Reset initialization when user logs out
    useEffect(() => {
        if (!user) {
            setIsInitialized(false);
            initStartedRef.current = false;
        }
    }, [user]);

    return {
        isSupported,
        permission,
        isSubscribed,
        subscription,
        subscribe,
        unsubscribe,
        toggleSubscription,
        checkExistingSubscription,
    };
};

export default usePushNotifications;
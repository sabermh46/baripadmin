import { useCallback, useEffect, useState, useRef } from "react";
import { useAppSelector } from ".";
import { toast } from "react-toastify";
import { axiosInstance } from "../store/api/baseApi";

const usePushNotifications = () => {
    const { user, accessToken: token } = useAppSelector(state => state.auth);
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Use refs to prevent infinite loops and multiple attempts
    const initStartedRef = useRef(false);
    const subscriptionAttemptRef = useRef(false);
    const permissionRef = useRef(permission);
    const isSubscribedRef = useRef(isSubscribed);
    const abortControllerRef = useRef(null);

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
            // Check if already registered
            const existingRegistrations = await navigator.serviceWorker.getRegistrations();
            const existingRegistration = existingRegistrations.find(reg => 
                reg.active && reg.active.scriptURL.includes('/sw.js')
            );

            if (existingRegistration) {
                console.log('Service worker already registered');
                return existingRegistration;
            }

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
                console.log('Found existing subscription:', existingSubscription.endpoint);
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

        // Prevent multiple concurrent subscription attempts
        if (subscriptionAttemptRef.current) {
            console.log('Subscription attempt already in progress');
            return false;
        }

        try {
            subscriptionAttemptRef.current = true;
            
            let notificationPermission = permissionRef.current;
            if (notificationPermission === 'default') {
                notificationPermission = await Notification.requestPermission();
                setPermission(notificationPermission);
                permissionRef.current = notificationPermission;
            }

            if (notificationPermission !== 'granted') {
                toast.error('Push notification permission was denied.');
                subscriptionAttemptRef.current = false;
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            // Check if we already have a subscription
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
                console.log('Already subscribed, updating subscription...');
                setSubscription(existing);
                setIsSubscribed(true);
                isSubscribedRef.current = true;
                
                // Convert existing subscription to sendable format
                const subscriptionData = {
                    endpoint: existing.endpoint,
                    expirationTime: existing.expirationTime,
                    keys: {
                        p256dh: existing.getKey ? 
                            btoa(String.fromCharCode.apply(null, new Uint8Array(existing.getKey('p256dh')))) :
                            existing.keys.p256dh,
                        auth: existing.getKey ? 
                            btoa(String.fromCharCode.apply(null, new Uint8Array(existing.getKey('auth')))) :
                            existing.keys.auth
                    }
                };

                // Update the subscription on server
                await axiosInstance.post('/push/subscribe', subscriptionData, {
                    signal: abortControllerRef.current?.signal,
                });

                toast.success('Push subscription updated.');
                subscriptionAttemptRef.current = false;
                return true;
            }

            // Create new subscription
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

            const response = await axiosInstance.post('/push/subscribe', subscriptionData, {
                signal: abortControllerRef.current?.signal,
            });

            console.log('Subscription response:', response.data);

            setSubscription(newSubscription);
            setIsSubscribed(true);
            isSubscribedRef.current = true;
            toast.success('Subscribed to push notifications successfully.');
            subscriptionAttemptRef.current = false;
            return true;
        } catch (error) {
            console.error('Subscription error:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
                // If it's a 409 conflict or similar, we might already be subscribed
                if (error.response.status === 409 || error.response.data?.error?.includes('already exists')) {
                    // Check if we actually have a subscription
                    const registration = await navigator.serviceWorker.ready;
                    const existing = await registration.pushManager.getSubscription();
                    if (existing) {
                        setSubscription(existing);
                        setIsSubscribed(true);
                        isSubscribedRef.current = true;
                        toast.success('Already subscribed to push notifications.');
                    }
                }
            } else {
                toast.error('Failed to subscribe to notifications');
            }
            subscriptionAttemptRef.current = false;
            return false;
        }
    }, [isSupported, publicKey]);

    const unsubscribe = useCallback(async () => {
        if (!subscription) {
            // Check if we have a subscription first
            try {
                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                if (!existing) {
                    setIsSubscribed(false);
                    isSubscribedRef.current = false;
                    return true;
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
            }
            return false;
        }

        try {
            await subscription.unsubscribe();
            
            await axiosInstance.post('/push/unsubscribe', { endpoint: subscription.endpoint }, {
                signal: abortControllerRef.current?.signal,
            });

            setSubscription(null);
            setIsSubscribed(false);
            isSubscribedRef.current = false;

            toast.success('Unsubscribed from push notifications.');
            return true;
        } catch (error) {
            if(error.response?.data?.error === "Subscription not found") {
                setSubscription(null);
                setIsSubscribed(false);
                isSubscribedRef.current = false;
                toast.success('Unsubscribed from push notifications.');
                return true;
            } else if (error?.response?.data?.error === "Access denied. No token provided."){
                toast.success('Unsubscribed from push notifications.');
                return true;
            }

            console.error('Unsubscription error:', error);
            toast.error('Failed to unsubscribe from notifications');
            return false;
        }
    }, [subscription]);

    const toggleSubscription = useCallback(async () => {
        if (isSubscribedRef.current) {
            return await unsubscribe();
        } else {
            return await subscribe();
        }
    }, [subscribe, unsubscribe]);

    // Initialize only once when user logs in
    useEffect(() => {
        if (user && isSupported && !isInitialized && !initStartedRef.current) {
            console.log('Initializing push notifications...');
            initStartedRef.current = true;
            abortControllerRef.current = new AbortController();

            const init = async () => {
                try {
                    await registerServiceWorker();
                    const existingSub = await checkExistingSubscription();

                    // Subscribe automatically on login. subscribe() itself calls
                    // Notification.requestPermission() when permission is still 'default',
                    // so this is what actually shows the browser's permission prompt — only
                    // 'denied' (an explicit prior refusal) skips it, so we don't nag repeatedly.
                    if (!existingSub && permissionRef.current !== 'denied') {
                        console.log('Auto-subscribing...');
                        await subscribe();
                    } else if (existingSub) {
                        console.log('Already subscribed:', existingSub.endpoint);
                    } else {
                        console.log('Not auto-subscribing. Permission:', permissionRef.current);
                    }

                    setIsInitialized(true);
                } catch (error) {
                    if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
                        console.error('Push notification initialization error:', error);
                        initStartedRef.current = false;
                    }
                }
            };

            init();

            return () => {
                abortControllerRef.current?.abort();
            };
        }
    }, [user, isSupported, isInitialized, registerServiceWorker, checkExistingSubscription, subscribe]);

    // Reset initialization when user logs out
    useEffect(() => {
        if (!user) {
            setIsInitialized(false);
            initStartedRef.current = false;
            subscriptionAttemptRef.current = false;
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
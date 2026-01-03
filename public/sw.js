//public/sw.js
const CACHE_NAME = 'bariporichalona-cache-v1'; 

// List of files to pre-cache (App Shell).
// In a Vite development environment, use these paths:
const urlsToCache = [
  '/', // Must cache the root page
  '/index.html',
  // Vite Development Assets (Adjust if your entry file is different)
  '/src/main.jsx', 
  '/src/index.css', 
  // Manifest and Icons
  '/manifest.json',
  '/icon-192x192.png',
  '/notification.mp3',
  // Add any other critical assets (logos, fonts, etc.)
];

// ------------------------------------
// 1. INSTALL Event Listener: Caching Assets
// ------------------------------------
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  // Open cache and add all defined assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache, pre-caching shell assets...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force new SW to become active immediately
  );
});

// ------------------------------------
// 2. ACTIVATE Event Listener: Cleanup Old Caches
// ------------------------------------
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache that is not in the current whitelist
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim clients immediately
  );
});

// ------------------------------------
// 3. FETCH Event Listener: Offline Strategy (Cache-First)
// ------------------------------------
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const requestUrl = new URL(event.request.url);
  
  // --- Define Exclusions ---
  // 1. Skip cross-origin requests (e.g., Google Fonts, analytics, external APIs)
  if (requestUrl.origin !== location.origin) return; 

  // 2. Skip dynamic routes/API endpoints (Auth and API calls)
  const isDynamicRoute = requestUrl.pathname.startsWith('/auth/') || requestUrl.pathname.startsWith('/api/');
  
  if (isDynamicRoute) {
      console.log(`[Fetch] Bypassing cache for dynamic route: ${requestUrl.pathname}`);
      // Let it go directly to the network (Network-Only strategy). 
      // It will naturally fail if offline, which is the correct behavior for dynamic data.
      return; 
  }
  
  // 3. Define App Shell/Static Assets strategy (Cache-First, Falling back to Network)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache Hit: return response
        if (response) {
          console.log(`[Fetch] Serving from cache: ${event.request.url}`);
          return response;
        }
        
        // Cache Miss: fetch from network
        console.log(`[Fetch] Fetching from network: ${event.request.url}`);
        return fetch(event.request)
          // (Rest of the caching logic for static assets remains here: cloning, putting in cache)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            // --- CRITICAL IMPROVEMENT ---
            // If fetching failed (offline) and it's a navigation request (i.e., a page load), 
            // you should serve a fallback page instead of throwing an unhandled exception.
            if (event.request.mode === 'navigate') {
              console.log('Fetch failed for navigation. Falling back to index.html.');
              // This assumes your cached index.html can handle the offline state gracefully.
              return caches.match('/index.html'); 
            }
            
            // Otherwise, let the error propagate.
            throw error;
          });
      })
  );
});

// ------------------------------------
// 4. PUSH Event Handler (Your existing code)
// ------------------------------------
self.addEventListener('push', function(event) {
  console.log('Push received');
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Bariporichalona',
      body: 'New notification'
    };
  }
  
  const title = data.title || 'Bariporichalona';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    vibrate: [100, 50, 100]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('Notification shown');
        return self.clients.matchAll();
      })
      .then(clients => {
        console.log(`Notifying ${clients.length} clients`);
        
        clients.forEach(client => {
          try {
            client.postMessage({
              type: 'NEW_NOTIFICATION',
              timestamp: Date.now()
            });
            console.log('Message sent to client');
          } catch (err) {
            console.log('Could not send message to client:', err);
          }
        });
        
        clients.forEach(client => {
          try {
            client.postMessage({
              type: 'UPDATE_LOCALSTORAGE',
              key: 'notification_update',
              value: Date.now().toString()
            });
          } catch (err) {
            console.log('Could not send localStorage update:', err);
          }
        });
      })
      .catch(err => {
        console.error('Error in push handler:', err);
      })
  );
});

// ------------------------------------
// 5. MESSAGE Handler (Your existing code)
// ------------------------------------
self.addEventListener('message', function(event) {
  console.log('SW Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: Skipping waiting and activating immediately');
    self.skipWaiting();
    
    // Notify all clients that update is happening
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ 
          type: 'UPDATE_COMPLETED', 
          timestamp: Date.now() 
        });
      });
    });
  }
});

// ------------------------------------
// 6. NOTIFICATION CLICK Handler (Your existing code)
// ------------------------------------
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
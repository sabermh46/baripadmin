// self.addEventListener('install', (event) => {
//   console.log('Service Worker: Installed');
//   self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//   console.log('Service Worker: Activated');
//   self.clients.claim();
// });

// // Push Notification Events
// self.addEventListener('push', (event) => {
//   console.log('Push event received:', event);
  
//   let data = {};
//   if (event.data) {
//     try {
//       data = event.data.json();
//     } catch (error) {
//       data = {
//         title: 'Bariporichalona',
//         body: 'You have a new notification.'
//       };
//     }
//   }

//   const title = data.title || "Bariporichalona";
//   const options = {
//     body: data.body || "You have a new notification.",
//     icon: data.icon || '/icon-192x192.png',
//     badge: data.badge || '/badge-72x72.png',
//     data: data.data || { url: '/' },
//     vibrate: [100, 50, 100],
//     tag: 'default-push-tag'
//   };

//   event.waitUntil(
//     self.registration.showNotification(title, options)
//       .then(() => {
//         console.log('Notification shown successfully');
        
//         // Send message to all clients to refresh notifications
//         self.clients.matchAll().then(clients => {
//           clients.forEach(client => {
//             client.postMessage({
//               type: 'NEW_NOTIFICATION',
//               data: data.data
//             });
//           });
//         });
//       })
//   );
// });

// self.addEventListener('message', (event) => {
//   if (event.data && event.data.type === 'UPDATE_NOTIFICATIONS') {
//     // Trigger notification refresh in all clients
//     self.clients.matchAll().then(clients => {
//       clients.forEach(client => {
//         client.postMessage({
//           type: 'REFRESH_NOTIFICATIONS'
//         });
//       });
//     });
//   }
// });

// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
  
//   const urlToOpen = event.notification.data?.url || '/';
  
//   event.waitUntil(
//     clients.matchAll({
//       type: 'window',
//       includeUncontrolled: true
//     }).then(clientList => {
//       // Check if there's already a window/tab open
//       for (const client of clientList) {
//         if (client.url.includes(self.location.origin) && 'focus' in client) {
//           return client.focus();
//         }
//       }
      
//       // If not, open a new window/tab
//       if (clients.openWindow) {
//         return clients.openWindow(urlToOpen);
//       }
//     })
//   );
// });
// sw.js - Simple reliable version
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  self.clients.claim();
});

// Push event handler
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
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('Notification shown');
        
        // Notify all clients about the new notification
        return self.clients.matchAll();
      })
      .then(clients => {
        console.log(`Notifying ${clients.length} clients`);
        
        clients.forEach(client => {
          // Send message to client
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
        
        // Also update localStorage via message to trigger cross-tab sync
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

// Message handler
self.addEventListener('message', function(event) {
  console.log('SW Received message:', event.data);
  
  if (event.data && event.data.type === 'UPDATE_NOTIFICATIONS') {
    // Forward refresh request to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'REFRESH_NOTIFICATIONS' });
        } catch (err) {
          console.log('Could not forward message:', err);
        }
      });
    });
  }
});

// Notification click handler
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
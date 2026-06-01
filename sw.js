// Service Worker para Calendario PAMM
const CACHE_NAME = 'calendario-pamm-v1';
const STATIC_CACHE = 'calendario-pamm-static-v1';
const DYNAMIC_CACHE = 'calendario-pamm-dynamic-v1';

// Archivos estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Georgia&display=swap'
];

// Instalación del service worker
self.addEventListener('install', event => {
  console.log('SW: Instalando service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('SW: Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del service worker
self.addEventListener('activate', event => {
  console.log('SW: Activando service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de caché: Cache First para recursos estáticos
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo para solicitudes HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Para recursos estáticos: Cache First
  if (STATIC_ASSETS.includes(url.pathname) || 
      url.pathname === '/' || 
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'manifest') {
    
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si no está en cache, buscar en red y cachear
          return fetch(request)
            .then(networkResponse => {
              // Verificar que la respuesta sea válida
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              
              // Clonar la respuesta para poder cachearla
              const responseToCache = networkResponse.clone();
              
              caches.open(STATIC_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
              
              return networkResponse;
            })
            .catch(() => {
              // Si falla la red y es una página HTML, servir página offline
              if (request.destination === 'document') {
                return caches.match('/index.html');
              }
            });
        })
    );
  }
  
  // Para imágenes: Network First con fallback a cache
  else if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
  
  // Para otras solicitudes: Network First
  else {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Sincronización en segundo plano para eventos
self.addEventListener('sync', event => {
  if (event.tag === 'sync-eventos') {
    event.waitUntil(syncEventos());
  }
});

// Función para sincronizar eventos
async function syncEventos() {
  try {
    const eventos = await getEventosFromStorage();
    // Aquí podrías implementar la sincronización con un backend
    console.log('SW: Sincronizando eventos:', eventos.length);
  } catch (error) {
    console.error('SW: Error sincronizando eventos:', error);
  }
}

// Obtener eventos desde storage (simulado)
async function getEventosFromStorage() {
  return new Promise((resolve) => {
    // En una app real, esto sería IndexedDB o similar
    const eventos = localStorage.getItem('eventosPamm');
    resolve(eventos ? JSON.parse(eventos) : []);
  });
}

// Push notifications (opcional)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Calendario',
        icon: '/icon-96.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Calendario PAMM', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Limpieza periódica de caché dinámico
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_UPDATED') {
    // Limpiar caché dinámico cuando se actualiza la app
    caches.delete(DYNAMIC_CACHE);
  }
});

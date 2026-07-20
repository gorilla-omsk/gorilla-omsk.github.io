var CACHE_NAME = 'gorilla-v2';
var IMAGE_CACHE_LIMIT = 100;

var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/GGVP.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Russo+One&display=swap'
];

// ============ УСТАНОВКА ============
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Кэширую критические ресурсы...');
      return cache.addAll(ASSETS_TO_CACHE).catch(function(err) {
        console.warn('[SW] Не все ресурсы закэшированы:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ============ АКТИВАЦИЯ ============
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          console.log('[SW] Удаляю старый кэш:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      trimImageCache();
      return self.clients.claim();
    })
  );
});

// ============ ОГРАНИЧЕНИЕ КЭША ИЗОБРАЖЕНИЙ ============
function trimImageCache() {
  caches.open(CACHE_NAME).then(function(cache) {
    cache.keys().then(function(keys) {
      var imageKeys = keys.filter(function(req) {
        return req.url.includes('/images/');
      });
      if (imageKeys.length > IMAGE_CACHE_LIMIT) {
        var toDelete = imageKeys.slice(0, imageKeys.length - IMAGE_CACHE_LIMIT);
        console.log('[SW] Чищу кэш изображений: удаляю ' + toDelete.length + ' файлов');
        toDelete.forEach(function(req) {
          cache.delete(req);
        });
      }
    });
  });
}

// ============ FETCH ============
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // 1. Google Sheets — всегда свежие данные
  if (url.includes('google.com') && url.includes('spreadsheets')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 2. Google Fonts — кэшируем надолго
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Изображения товаров — кэшируем при загрузке
  if (url.includes('/images/')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) {
          // Фоновое обновление
          fetch(e.request).then(function(response) {
            if (response.ok) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(e.request, response);
                trimImageCache();
              });
            }
          }).catch(function() {});
          return cached;
        }
        return fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
              trimImageCache();
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. HTML-страницы — офлайн-заглушка
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 5. Всё остальное — сначала кэш, потом сеть
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Фоновое обновление
        fetch(e.request).then(function(response) {
          if (response.ok) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, response);
            });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(e.request).then(function(response) {
        if (!response || !response.ok) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        // Если нет в кэше и сеть недоступна
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ============ PUSH (заготовка для будущих уведомлений) ============
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : {};
  var title = data.title || 'GORILLA STREETWEAR';
  var options = {
    body: data.body || 'Новый дроп уже в наличии!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(e.notification.data.url || '/');
      }
    })
  );
});

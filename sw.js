var CACHE_NAME = 'gorilla-v2';
var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/script.js',
  '/GGVP.jpg',
  '/manifest.json'
];

// Установка — кэшируем критическое
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Активация — чистим старый кэш
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — сначала кэш, потом сеть
self.addEventListener('fetch', function(e) {
  // Пропускаем Google Sheets CSV (всегда свежие данные)
  if (e.request.url.includes('google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Фоном обновляем кэш
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
        if (!response.ok) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      });
    })
  );
});

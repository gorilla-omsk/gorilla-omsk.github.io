// Service Worker — очистка старого кэша
self.addEventListener('install', function() {
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) {
                return caches.delete(key);
            }));
        })
    );
});

// Не кэшируем — просто пропускаем запросы
self.addEventListener('fetch', function(e) {
    e.respondWith(fetch(e.request));
});

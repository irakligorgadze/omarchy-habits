const CACHE_NAME = 'habit-matrix-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Skip API calls from cache interception so they go to the network/sync handler
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
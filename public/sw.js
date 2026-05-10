// public/sw.js
// NOTE: This file must use var and function declarations — no ES module syntax.
// It runs in a service worker scope, not a browser module scope.

var CACHE_NAME = 'locallens-v1';
var OFFLINE_URL = '/offline';
var PRECACHE_URLS = ['/', '/businesses', '/map', OFFLINE_URL];

// Install — cache the app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).catch(function (err) {
      console.log('[SW] Pre-cache failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip API routes and auth endpoints
  var url = request.url;
  if (url.includes('/api/') || url.includes('/_next/webpack')) return;

  // Cache Next.js static assets (immutable)
  if (url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        return cached || fetch(request).then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Network first for HTML pages
  event.respondWith(
    fetch(request).then(function (response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, clone);
      });
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});
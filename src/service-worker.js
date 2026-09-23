// Hand-rolled and deliberately small.
//
// THE VERSION IS STAMPED AT BUILD TIME by scripts/stamp-service-worker.js,
// from a hash of the built index.html. It has to be: a browser decides
// whether a worker has changed by comparing the bytes of this file, and this
// file used to be identical on every deploy — so `registration.waiting`
// never appeared and there was nothing for an update prompt to detect. The
// placeholder is replaced after `ng build`; if it is still here, the build
// script did not run.
const CACHE_VERSION = 'math-game-__BUILD_VERSION__';
// The character's parts are precached at install, not on first use: a child
// who installs and goes offline before seeing their character would otherwise
// get one with no hair, no eyes and no clothes.
const SHELL = ['./', './index.html', './assets/icon-192.png', './assets/icon-512.png',
  './assets/avatar/parts.svg'];

// NO skipWaiting HERE, on purpose. A new worker that takes over the moment
// it installs swaps the cache under a page that is still running the old
// code, and a child mid-round gets the new shell with no warning. The
// documented pattern is to wait, let the app ask the child, and take over
// only when they say yes — see src/app/pwa/update-offer.ts.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL))
  );
});

// The two things the page may ask a waiting worker: who are you, and take
// over now. Nothing else, and nothing without being asked.
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'version' && event.ports && event.ports[0]) {
    event.ports[0].postMessage(CACHE_VERSION);
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navigations go to the network first, so a deployed fix reaches a child on
  // their next online visit rather than waiting for the cache to expire.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Built assets carry a content hash in their name, so cache-first is safe.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached))
  );
});

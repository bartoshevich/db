---
layout: null
---

'use strict';

(function() {

    const version = 'v131::';
    const staticCacheName = 'static';
    const pagesCacheName = 'pages';
    const imagesCacheName = 'images';



  // Store core files in a cache (including a page to display when offline)
  async function updateStaticCache() {
    const cache = await caches.open(version + staticCacheName);
    await cache.addAll([
      '/',
      '/cases/',
      '/blog/',
      '/faq/',
      '/contact/',
      '/uslugi/',
      '/uslugi/marketing-audit/',
      '/uslugi/brand-conception/',
      '/uslugi/razrabotka-reklamnyh-kampanij/',
      '/uslugi/autsorsing-marketinga/',
      '/about/',
      '/offline/',
      '/blog/brand-giperlink/',
      '/blog/seth-godin/',
      '/blog/stars/',
      '/blog/brand-conception-hormann/',
      '/blog/brand-strategy-flex-n-roll/',
      '/assets/css/style.css',
      '/assets/css/style-home.css',
      '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-regular.woff2',
      '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-700.woff2',
      '/assets/fonts/pt-sans-v12-latin_cyrillic/pt-sans-v12-latin_cyrillic-italic.woff2',
      '/assets/images/logo/bartoshevich@1x.avif',
      '/assets/images/logo/bartoshevich@2x.avif',
      '/assets/images/logo/bartoshevich@1x.webp',
      '/assets/images/logo/bartoshevich@2x.webp'
    ]);
  }


  // Put an item in a specified cache
  async function stashInCache(cacheName, request, response) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  }

  // Limit the number of items in a specified cache.
  async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      return trimCache(cacheName, maxItems); 
    }
  }

  // Remove caches whose name is no longer valid
  async function clearOldCaches() {
    const keys = await caches.keys();
    const oldKeys = keys.filter(key => !key.startsWith(version));
    return Promise.all(oldKeys.map(key => caches.delete(key)));
  }

 
  self.addEventListener('install', event => {
    event.waitUntil(
      (async () => {
        try {
          await updateStaticCache();
          await self.skipWaiting();
        } catch (err) {
          console.error('[ServiceWorker] Install failed:', err);
        }
      })()
    );
  });

  self.addEventListener('activate', event => {
    event.waitUntil(
      (async () => {
        try {
          await clearOldCaches();
          await self.clients.claim();
        } catch (err) {
          console.error('[ServiceWorker] Activate failed:', err);
        }
      })()
    );
  });

  // See: https://brandonrozek.com/2015/11/limiting-cache-service-workers-revisited/
  self.addEventListener('message', event => {
    if (event.data.command === 'trimCaches') {
      trimCache(version + pagesCacheName, 35);
      trimCache(version + imagesCacheName, 20);
    }
  });

   // Обработка всех fetch-запросов
   self.addEventListener('fetch', event => {
    const request = event.request;
    // Не-GET запросы: пробуем сеть, при ошибке — offline
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request).catch(() => caches.match('/offline/'))
      );
      return;
    }

 
    if (request.headers.get('Accept')?.includes('text/html')) {
    
      let fixedRequest = request;
      if (request.mode !== 'navigate') {
        fixedRequest = new Request(request.url, {
          method: 'GET',
          headers: request.headers,
          mode: request.mode,
          credentials: request.credentials,
          redirect: request.redirect
        });
      }

      event.respondWith(
        (async () => {
          try {
            const response = await fetch(fixedRequest);
            const copy = response.clone();
            await stashInCache(version + pagesCacheName, fixedRequest, copy);
            return response;
          } catch (err) {
            const cachedResponse = await caches.match(fixedRequest);
            return cachedResponse || caches.match('/offline/');
          }
        })()
      );
      return;
    }

 
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
           if (cachedResponse) return cachedResponse;
        try {     
          const networkResponse = await fetch(request);  
          if (request.headers.get('Accept')?.includes('image')) {
            const copy = networkResponse.clone();
            await stashInCache(version + imagesCacheName, request, copy);
          }
          return networkResponse;
        } catch (err) {
   
          if (request.headers.get('Accept')?.includes('image')) {
            return new Response(
              '<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#9B9B9B" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-weight="bold"><tspan x="93" y="172">offline</tspan></text></g></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' }}
            );
          }
          return undefined; 
        }
      })()
    );
  });
})();